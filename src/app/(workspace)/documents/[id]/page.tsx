import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { pageAuth } from "@/server/page-auth";
import { AppError } from "@/server/errors";
import { csrfToken } from "@/modules/identity/server/service";
import {
  getDocument,
  getDocumentHistory,
} from "@/modules/documents/server/service";
import { PdfPreview } from "@/modules/documents/ui/pdf-preview";
import { MetadataEditor } from "@/modules/documents/ui/metadata-editor";
import { getProcessingJob } from "@/modules/processing/server/service";
import { ProcessingControls } from "@/modules/processing/ui/processing-controls";
import { getValidation } from "@/modules/validation/server/service";
import { ValidationPanel } from "@/modules/validation/ui/validation-panel";
import { getVerificationTaskForDocument } from "@/modules/verification/server/service";
import { getLandRecordForDocument } from "@/modules/land-records/server/service";
export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { token, actor } = await pageAuth();
  const { id } = await params;
  const doc = await getDocument(token, id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  const history = await getDocumentHistory(token, id);
  const processing = actor.permissions.includes("processing.read")
    ? await getProcessingJob(token, id)
    : null;
  const validation = actor.permissions.includes("processing.read")
    ? await getValidation(token, id)
    : null;
  const verificationTask = actor.permissions.includes("verification.read")
    ? await getVerificationTaskForDocument(token, id)
    : null;
  const record = actor.permissions.includes("records.read")
    ? await getLandRecordForDocument(token, id)
    : null;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <Link href="/documents">Documents</Link> / {doc.displayId}
          </p>
          <h1>{doc.title}</h1>
          <p className="muted">
            {doc.district} · {doc.village}
          </p>
        </div>
        <div className="toolbar">
        {verificationTask && (
          <Link className="button" href={`/verification/${verificationTask.task.id}`}>
            Open verification
          </Link>
        )}
        {record && (
          <Link className="button" href={`/records/${record.id}`}>
            View record
          </Link>
        )}
        <a
          className="button"
          href={`/api/v1/documents/${id}/content?download=1`}
        >
          Download original
        </a>
        </div>
      </div>
      <div className="document-grid">
        <section className="panel">
          <h2>Source document</h2>
          {doc.mimeType === "application/pdf" ? (
            <PdfPreview id={id} />
          ) : (
            <Image
              className="source-image"
              src={`/api/v1/documents/${id}/content`}
              width={1800}
              height={1800}
              unoptimized
              alt={`Preview of ${doc.title}`}
            />
          )}
        </section>
        <div className="stack">
          <section className="panel">
            <h2>Document details</h2>
            <span className="tag">{doc.status}</span>
            {actor.permissions.includes("processing.read") && (
              <ProcessingControls
                documentId={id}
                csrfToken={csrfToken(token!)}
                initial={processing}
                canSubmit={actor.permissions.includes("processing.submit")}
              />
            )}
            <dl className="detail-list">
              {Object.entries({
                Filename: doc.originalName,
                Pages: doc.pageCount,
                Size: `${(doc.byteSize / 1024).toFixed(1)} KB`,
                Type: doc.typeName ?? "Unclassified",
                Schema: doc.schemaVersion
                  ? `Version ${doc.schemaVersion}`
                  : "Not assigned",
                Language: doc.language || "Not specified",
                Reference: doc.reference || "None",
                Revision: doc.revision,
              }).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p>{doc.notes}</p>
            <details>
              <summary>Original SHA-256</summary>
              <p className="mono hash">{doc.sha256}</p>
            </details>
          </section>
          {actor.id === doc.uploaderId &&
            actor.permissions.includes("documents.upload") && (
              <MetadataEditor
                key={doc.revision}
                document={doc}
                csrfToken={csrfToken(token!)}
              />
            )}
        </div>
      </div>
      <section className="panel editor">
        <h2>Document history</h2>
        {history.metadata.map((row) => (
          <div className="history-entry" key={Number(row.revision)}>
            <strong>Metadata revision {Number(row.revision)}</strong>
            <span className="cell-secondary">
              {String(row.reason)} ·{" "}
              {new Date(String(row.createdAt)).toLocaleString("en-IN")}
            </span>
            <details>
              <summary>Recorded values</summary>
              <pre>{JSON.stringify(row.values, null, 2)}</pre>
            </details>
          </div>
        ))}
        {history.status.map((row, i) => (
          <p key={i} className="small">
            Status: {String(row.toStatus)} — {String(row.reason)}
          </p>
        ))}
      </section>
      {validation && (
        <ValidationPanel
          validation={validation}
          csrfToken={csrfToken(token!)}
          canResolveDuplicates={actor.permissions.includes("duplicates.resolve")}
        />
      )}
    </>
  );
}
