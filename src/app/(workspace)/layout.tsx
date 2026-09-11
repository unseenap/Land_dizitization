import { pageAuth } from "@/server/page-auth";
import { csrfToken } from "@/modules/identity/server/service";
import { LogoutButton } from "@/modules/identity/ui/logout-button";
import { WorkspaceShell, type WorkspaceNavItem } from "./workspace-shell";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { actor, token } = await pageAuth();
  const navItems: WorkspaceNavItem[] = [
    { href: "/dashboard", label: "Overview", icon: "dashboard", section: "Workspace" },
    { href: "/documents", label: "Documents", icon: "documents", section: "Workspace" },
    { href: "/records", label: "Approved records", icon: "archive", section: "Workspace" },
    ...(actor.permissions.includes("gis.read") ? [{ href: "/gis", label: "GIS parcels", icon: "gis" as const, section: "Workspace" as const }] : []),
    ...(actor.permissions.includes("integrations.read") ? [{ href: "/integrations", label: "Integrations", icon: "integrations" as const, section: "Workspace" as const }] : []),
    ...(actor.permissions.includes("feedback.read") ? [{ href: "/feedback", label: "Feedback and evaluation", icon: "feedback" as const, section: "Workspace" as const }] : []),
    ...(actor.permissions.includes("documents.upload") ? [{ href: "/documents/upload", label: "Upload documents", icon: "upload" as const, section: "Workspace" as const }] : []),
    ...(actor.permissions.includes("master-data.manage") ? [{ href: "/admin/master-data", label: "Administrative areas", icon: "building" as const, section: "Administration" as const }] : []),
    ...(actor.permissions.includes("document-types.manage") ? [{ href: "/admin/document-types", label: "Document types", icon: "document" as const, section: "Administration" as const }] : []),
    ...(actor.permissions.includes("users.manage") ? [{ href: "/admin/users", label: "Users & access", icon: "users" as const, section: "Administration" as const }] : []),
    ...(actor.permissions.includes("audit.read") ? [{ href: "/audit", label: "Audit history", icon: "audit" as const, section: "Administration" as const }] : []),
  ];
  return (
    <WorkspaceShell
      departmentName={actor.departmentName}
      actorName={actor.name}
      navItems={navItems}
      logout={<LogoutButton csrfToken={csrfToken(token!)} />}
    >
      {children}
    </WorkspaceShell>
  );
}
