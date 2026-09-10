"use client";
import Link from "next/link";
import { useState } from "react";
import type { MasterTree } from "@/modules/master-data/contracts";
import type { TypeSummary } from "@/modules/document-types/contracts";
type Entry = {
  file: File;
  key: string;
  progress: number;
  error?: string;
  id?: string;
  metadata?: unknown;
};
export function UploadForm({
  tree,
  types,
  csrfToken,
  maxFiles,
  maxMb,
}: {
  tree: MasterTree;
  types: TypeSummary[];
  csrfToken: string;
  maxFiles: number;
  maxMb: number;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [tehsil, setTehsil] = useState("");
  function select(files: File[]) {
    if (
      files.length > maxFiles ||
      files.some((f) => f.size > maxMb * 1024 * 1024)
    ) {
      setError(`Choose up to ${maxFiles} files, each at most ${maxMb} MB.`);
      return;
    }
    setError("");
    setEntries(
      files.map((file) => ({ file, key: crypto.randomUUID(), progress: 0 })),
    );
  }
  function patch(key: string, data: Partial<Entry>) {
    setEntries((old) =>
      old.map((e) => (e.key === key ? { ...e, ...data } : e)),
    );
  }
  return (
    <form
      className="panel"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        const form = new FormData(event.currentTarget);
        for (const entry of entries) {
          if (entry.id) continue;
          const metadata = entry.metadata ?? {
            title: entry.file.name
              .replace(/\.[^.]+$/, "")
              .slice(0, 200)
              .padEnd(2, "_"),
            villageId: form.get("villageId"),
            schemaVersionId: form.get("schemaVersionId") || null,
            language: form.get("language"),
            reference: form.get("reference"),
            notes: form.get("notes"),
          };
          patch(entry.key, { metadata, error: undefined, progress: 0 });
          await new Promise<void>((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/v1/documents/upload");
            xhr.setRequestHeader("X-CSRF-Token", csrfToken);
            xhr.setRequestHeader("Idempotency-Key", entry.key);
            xhr.timeout = 120000;
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable)
                patch(entry.key, {
                  progress: Math.round((e.loaded / e.total) * 100),
                });
            };
            xhr.onload = () => {
              try {
                const result = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300)
                  patch(entry.key, { id: result.document.id, progress: 100 });
                else
                  patch(entry.key, {
                    error: result.error?.message ?? "Upload failed.",
                  });
              } catch {
                patch(entry.key, {
                  error: "Unexpected response. Retry this upload.",
                });
              }
              resolve();
            };
            xhr.onerror = xhr.ontimeout = () => {
              patch(entry.key, {
                error:
                  "Connection interrupted. Retry safely with the same upload key.",
              });
              resolve();
            };
            const body = new FormData();
            body.append("file", entry.file);
            body.append("metadata", JSON.stringify(metadata));
            xhr.send(body);
          });
        }
        setBusy(false);
      }}
    >
      <fieldset
        disabled={busy || entries.some((e) => e.metadata !== undefined)}
      >
        <legend>Shared document details</legend>
        <div className="form-grid">
          <label>
            State
            <select
              required
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setDistrict("");
                setTehsil("");
              }}
            >
              <option value="">Choose state</option>
              {tree.states.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            District
            <select
              required
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setTehsil("");
              }}
            >
              <option value="">Choose district</option>
              {tree.districts
                .filter((a) => a.stateId === state)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Tehsil
            <select
              required
              value={tehsil}
              onChange={(e) => setTehsil(e.target.value)}
            >
              <option value="">Choose tehsil</option>
              {tree.tehsils
                .filter((a) => a.districtId === district)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Village
            <select name="villageId" required key={tehsil}>
              <option value="">Choose village</option>
              {tree.villages
                .filter((a) => a.tehsilId === tehsil)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Document type
            <select name="schemaVersionId">
              <option value="">Unclassified</option>
              {types.map((t) => (
                <option key={t.id} value={t.schemaVersionId}>
                  {t.name} · v{t.version}
                </option>
              ))}
            </select>
          </label>
          <label>
            Language
            <input name="language" maxLength={50} />
          </label>
          <label>
            Reference
            <input name="reference" maxLength={100} />
          </label>
          <label>
            Notes
            <input name="notes" maxLength={2000} />
          </label>
        </div>
      </fieldset>
      <div
        className="drop-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) select(Array.from(e.dataTransfer.files));
        }}
      >
        <label>
          Choose files or drop them here
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff"
            disabled={busy}
            onChange={(e) => select(Array.from(e.target.files ?? []))}
          />
        </label>
        <p className="small muted">
          PDF, JPEG, PNG or single-page TIFF. Up to {maxFiles} files, {maxMb} MB
          each. Titles start with the filename.
        </p>
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <div aria-live="polite">
        {entries.map((e) => (
          <div className="history-entry" key={e.key}>
            <strong>{e.file.name}</strong>
            <progress
              value={e.progress}
              max={100}
              aria-label={`Upload progress for ${e.file.name}`}
            />
            {e.id ? (
              <Link className="button subtle" href={`/documents/${e.id}`}>
                Open document
              </Link>
            ) : (
              <span className="small">
                {e.error ??
                  (e.progress === 100
                    ? "Validating and saving…"
                    : `${e.progress}% uploaded`)}
              </span>
            )}
          </div>
        ))}
      </div>
      <button
        className="button primary"
        disabled={busy || !entries.length || entries.every((e) => e.id)}
      >
        {busy
          ? "Uploading…"
          : entries.some((e) => e.error)
            ? "Retry failed uploads"
            : "Upload selected files"}
      </button>
      <p className="small muted">
        Uploads are preserved and recorded. OCR and extraction are introduced in
        the next phase.
      </p>
    </form>
  );
}
