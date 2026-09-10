import { pageAuth } from "@/server/page-auth";
import {
  csrfToken,
  requirePermission,
} from "@/modules/identity/server/service";
import { listTypes } from "@/modules/document-types/server/service";
import { TypeManager } from "@/modules/document-types/ui/type-manager";
export default async function Types() {
  const { token, actor } = await pageAuth();
  requirePermission(actor, "document-types.manage");
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Document types</h1>
          <p className="muted">
            Versioned field definitions for each class of source record.
          </p>
        </div>
      </div>
      <TypeManager
        types={await listTypes(token)}
        csrfToken={csrfToken(token!)}
      />
    </>
  );
}
