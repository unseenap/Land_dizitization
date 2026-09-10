"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/shared/api-client";
import {
  defaultFields,
  type FieldDefinition,
  type TypeSummary,
  fieldsSchema,
} from "../contracts";
export function TypeManager({
  types,
  csrfToken,
}: {
  types: TypeSummary[];
  csrfToken: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [fields, setFields] = useState<FieldDefinition[]>(defaultFields);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const current = types.find((t) => t.id === selected);
  function change(index: number, patch: Partial<FieldDefinition>) {
    setFields((old) =>
      old.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    );
  }
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Document type</th>
              <th>Current schema</th>
              <th>Fields</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id}>
                <td>
                  <strong>{t.name}</strong>
                  <span className="cell-secondary">{t.code}</span>
                </td>
                <td>Version {t.version}</td>
                <td>{t.fields.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="panel editor"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const valid = fieldsSchema.safeParse(fields);
          if (!valid.success) {
            setMessage(
              "Use 1–50 fields with unique lowercase keys and non-empty labels.",
            );
            return;
          }
          setBusy(true);
          setMessage("");
          try {
            await api(
              current
                ? `/api/v1/document-types/${current.id}/schema-versions`
                : "/api/v1/document-types",
              {
                method: "POST",
                csrfToken,
                body: current
                  ? {
                      expectedVersion: current.version,
                      fields,
                      reason: data.get("reason"),
                    }
                  : {
                      code: data.get("code"),
                      name: data.get("name"),
                      fields,
                      reason: data.get("reason"),
                    },
              },
            );
            setMessage(
              current
                ? "New schema version published. Existing uploads retain their original version."
                : "Document type created.",
            );
            router.refresh();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Save failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>Configure document schema</h2>
        <label>
          Action
          <select
            value={selected}
            onChange={(e) => {
              const value = e.target.value;
              setSelected(value);
              setFields(
                types.find((t) => t.id === value)?.fields ?? defaultFields,
              );
              setMessage("");
            }}
          >
            <option value="">Create a document type</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                Publish new version: {t.name}
              </option>
            ))}
          </select>
        </label>
        {!current && (
          <div className="form-grid">
            <label>
              Type name
              <input name="name" required minLength={2} maxLength={100} />
            </label>
            <label>
              Type code
              <input
                name="code"
                required
                pattern="[a-z][a-z0-9_-]{1,39}"
                title="Lowercase letters, digits, underscores or hyphens"
                maxLength={40}
              />
            </label>
          </div>
        )}
        <p className="small muted">
          Define expected fields for the future extraction workflow. Required
          fields must be supplied for later validation; critical fields need
          special review. Publishing creates an immutable version.
        </p>
        <div className="stack">
          {fields.map((f, i) => (
            <fieldset key={i}>
              <legend>Field {i + 1}</legend>
              <div className="field-grid">
                <label>
                  Key
                  <input
                    aria-label={`Field ${i + 1} key`}
                    value={f.key}
                    required
                    pattern="[a-z][a-z0-9_]{0,49}"
                    maxLength={50}
                    onChange={(e) => change(i, { key: e.target.value })}
                  />
                </label>
                <label>
                  Label
                  <input
                    aria-label={`Field ${i + 1} label`}
                    value={f.label}
                    required
                    maxLength={100}
                    onChange={(e) => change(i, { label: e.target.value })}
                  />
                </label>
                <label>
                  Value type
                  <select
                    value={f.type}
                    onChange={(e) =>
                      change(i, {
                        type: e.target.value as FieldDefinition["type"],
                      })
                    }
                  >
                    {["text", "number", "date", "boolean"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="toolbar">
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) => change(i, { required: e.target.checked })}
                  />
                  Required
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={f.critical}
                    onChange={(e) => change(i, { critical: e.target.checked })}
                  />
                  Critical
                </label>
                <button
                  type="button"
                  className="button"
                  disabled={fields.length === 1}
                  onClick={() =>
                    setFields(fields.filter((_, index) => index !== i))
                  }
                >
                  Remove field {i + 1}
                </button>
              </div>
            </fieldset>
          ))}
        </div>
        <button
          type="button"
          className="button editor"
          disabled={fields.length >= 50}
          onClick={() =>
            setFields([
              ...fields,
              {
                key: "",
                label: "",
                type: "text",
                required: false,
                critical: false,
              },
            ])
          }
        >
          Add field
        </button>
        <label>
          Reason for this schema
          <input name="reason" required minLength={3} maxLength={500} />
        </label>
        <button className="button primary editor" disabled={busy}>
          {busy
            ? "Saving…"
            : current
              ? `Publish version ${current.version + 1}`
              : "Create document type"}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </>
  );
}
