import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { pageAuth } from "@/server/page-auth";
import { csrfToken } from "@/modules/identity/server/service";
import { PdfPreview } from "@/modules/documents/ui/pdf-preview";
import { getVerificationTask } from "@/modules/verification/server/service";
import { VerificationWorkbench } from "@/modules/verification/ui/verification-workbench";

export default async function VerificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { token, actor } = await pageAuth();
  const { id } = await params;
  const view = await getVerificationTask(token, id).catch(() => notFound());
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <Link href="/documents">Documents</Link> / {view.document.displayId} / Verification
          </p>
          <h1>{view.document.title}</h1>
          <p className="muted">
            {view.document.district} · {view.document.village} · Revision{" "}
            {view.task.documentRevision}
          </p>
        </div>
        <a className="button" href={`/api/v1/documents/${view.task.documentId}/content?download=1`}>
          Download original
        </a>
      </div>
      <div className="document-grid">
        <section className="panel">
          <h2>Source document</h2>
          {view.document.mimeType === "application/pdf" ? (
            <PdfPreview id={view.task.documentId} />
          ) : (
            <Image
              className="source-image"
              src={`/api/v1/documents/${view.task.documentId}/content`}
              width={1800}
              height={1800}
              unoptimized
              alt={`Preview of ${view.document.title}`}
            />
          )}
        </section>
        <VerificationWorkbench
          initial={view}
          csrfToken={csrfToken(token!)}
          canReview={actor.permissions.includes("verification.review")}
          canCorrect={actor.permissions.includes("verification.correct")}
        />
      </div>
    </>
  );
}
