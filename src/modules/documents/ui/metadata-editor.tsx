"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/shared/api-client";
import type { DocumentSummary } from "../contracts";
export function MetadataEditor({
  document: doc,
  csrfToken,
}: {
  document: DocumentSummary;
  csrfToken: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <details className="panel">
      <summary>Edit descriptive metadata</summary>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          setBusy(true);
          setMessage("");
          try {
            await api(`/api/v1/documents/${doc.id}`, {
              method: "PATCH",
              csrfToken,
              body: {
                expectedRevision: doc.revision,
                title: form.get("title"),
                language: form.get("language"),
                reference: form.get("reference"),
                notes: form.get("notes"),
                reason: form.get("reason"),
              },
            });
            setMessage("Metadata saved.");
            router.refresh();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Save failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {(["title", "language", "reference", "notes"] as const).map((key) => (
          <label key={key} className="capitalize">
            {key}
            <input
              name={key}
              defaultValue={doc[key]}
              required={key === "title"}
              minLength={key === "title" ? 2 : undefined}
              maxLength={
                key === "title"
                  ? 200
                  : key === "notes"
                    ? 2000
                    : key === "reference"
                      ? 100
                      : 50
              }
            />
          </label>
        ))}
        <label>
          Reason for change
          <input name="reason" required minLength={3} maxLength={500} />
        </label>
        <p className="small muted">
          The source, location and schema version remain fixed. Every change
          creates a history entry.
        </p>
        <button className="button primary" disabled={busy}>
          {busy ? "Saving…" : "Save metadata"}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}
