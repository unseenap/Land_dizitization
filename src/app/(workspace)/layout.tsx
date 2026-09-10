import Link from "next/link";
import { pageAuth } from "@/server/page-auth";
import { csrfToken } from "@/modules/identity/server/service";
import { LogoutButton } from "@/modules/identity/ui/logout-button";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { actor, token } = await pageAuth();
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">LR</span>
          <span>
            Land Records<span className="brand-sub">Department workspace</span>
          </span>
        </Link>
        <p className="nav-label">Workspace</p>
        <nav aria-label="Main navigation">
          <Link href="/dashboard">Overview</Link>
          <Link href="/documents">Documents</Link>
          {actor.permissions.includes("documents.upload") && (
            <Link href="/documents/upload">Upload documents</Link>
          )}
          {actor.permissions.includes("master-data.manage") && (
            <Link href="/admin/master-data">Administrative areas</Link>
          )}
          {actor.permissions.includes("document-types.manage") && (
            <Link href="/admin/document-types">Document types</Link>
          )}
          {actor.permissions.includes("users.manage") && (
            <Link href="/admin/users">Users & access</Link>
          )}
          {actor.permissions.includes("audit.read") && (
            <Link href="/audit">Audit history</Link>
          )}
        </nav>
        <div className="sidebar-bottom">
          <span className="tag dark">Phase 2 · Documents</span>
          <p>Secure access and traceable actions.</p>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <div>
            <p className="department">{actor.departmentName}</p>
            <span className="muted small">
              Synthetic development environment
            </span>
          </div>
          <div className="account">
            <span>{actor.name}</span>
            <LogoutButton csrfToken={csrfToken(token!)} />
          </div>
        </header>
        <main id="main" className="page-content">
          {children}
        </main>
        <footer className="workspace-footer">
          SIH26018 · Authorized departmental access
        </footer>
      </div>
    </div>
  );
}
