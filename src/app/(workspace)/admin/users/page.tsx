import { pageAuth } from "@/server/page-auth";
import { listUsers, csrfToken } from "@/modules/identity/server/service";
import { UserManager } from "@/modules/identity/ui/user-manager";
export default async function UsersPage() {
  const { actor, token } = await pageAuth();
  if (!actor.permissions.includes("users.manage"))
    return (
      <section className="panel">
        <h1>Access restricted</h1>
        <p>Your role does not include user management.</p>
      </section>
    );
  const data = await listUsers(token);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Users & access</h1>
          <p className="muted">
            Manage accounts within your department and assigned jurisdictions.
          </p>
        </div>
      </div>
      <UserManager
        initial={JSON.parse(JSON.stringify(data))}
        actor={actor}
        csrfToken={csrfToken(token!)}
      />
    </>
  );
}
