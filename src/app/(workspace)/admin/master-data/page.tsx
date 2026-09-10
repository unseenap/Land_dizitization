import { pageAuth } from "@/server/page-auth";
import {
  csrfToken,
  requirePermission,
} from "@/modules/identity/server/service";
import { getMasterData } from "@/modules/master-data/server/service";
import { AreaManager } from "@/modules/master-data/ui/area-manager";
export default async function MasterData() {
  const { token, actor } = await pageAuth();
  requirePermission(actor, "master-data.manage");
  const tree = await getMasterData(token);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Administrative areas</h1>
          <p className="muted">
            State → district → tehsil → village, constrained by your assigned
            scopes.
          </p>
        </div>
      </div>
      <AreaManager
        tree={tree}
        scopes={actor.scopes}
        csrfToken={csrfToken(token!)}
      />
    </>
  );
}
