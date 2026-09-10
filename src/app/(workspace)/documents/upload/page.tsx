import { pageAuth } from "@/server/page-auth";
import { getConfig } from "@/server/config";
import {
  csrfToken,
  requirePermission,
} from "@/modules/identity/server/service";
import { getMasterData } from "@/modules/master-data/server/service";
import { listTypes } from "@/modules/document-types/server/service";
import { UploadForm } from "@/modules/documents/ui/upload-form";
export default async function Upload() {
  const { token, actor } = await pageAuth();
  requirePermission(actor, "documents.upload");
  const [tree, types] = await Promise.all([
    getMasterData(token),
    listTypes(token),
  ]);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Document intake</p>
          <h1>Upload documents</h1>
          <p className="muted">
            Select the administrative area and preserve your source files.
          </p>
        </div>
      </div>
      <UploadForm
        tree={tree}
        types={types}
        csrfToken={csrfToken(token!)}
        maxFiles={getConfig().MAX_BATCH_FILES}
        maxMb={getConfig().MAX_UPLOAD_MB}
      />
    </>
  );
}
