"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { List, X } from "@phosphor-icons/react";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";

export type WorkspaceNavItem = {
  href: string;
  label: string;
  icon: AppIconName;
  section: "Workspace" | "Administration";
};

export function WorkspaceShell({
  children,
  departmentName,
  actorName,
  navItems,
  logout,
}: {
  children: ReactNode;
  departmentName: string;
  actorName: string;
  navItems: WorkspaceNavItem[];
  logout: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="workspace">
      <aside className={`sidebar ${open ? "is-open" : ""}`} aria-label="Application sidebar">
        <div className="sidebar-brand-row">
          <Link href="/dashboard" className="brand" aria-label="Land Records dashboard">
            <span className="brand-mark"><AppIcon name="document" size={21} weight="duotone" /></span>
            <span>Land Records<span className="brand-sub">Department workspace</span></span>
          </Link>
          <button className="icon-button sidebar-close" type="button" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>
        {(["Workspace", "Administration"] as const).map((section) => {
          const items = navItems.filter((item) => item.section === section);
          if (!items.length) return null;
          return (
            <div className="nav-group" key={section}>
              <p className="nav-label">{section}</p>
              <nav aria-label={`${section} navigation`}>
                {items.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={isActive(item.href) ? "active" : undefined} aria-current={isActive(item.href) ? "page" : undefined}>
                    <AppIcon name={item.icon} size={19} />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          );
        })}
        <div className="sidebar-bottom">
          <span className="environment-dot" aria-hidden="true" />
          <div><strong>Development workspace</strong><span>Synthetic records only</span></div>
        </div>
      </aside>
      {open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <div className="workspace-body">
        <header className="topbar">
          <button className="icon-button menu-button" type="button" onClick={() => setOpen(true)} aria-label="Open navigation">
            <List size={22} />
          </button>
          <div className="topbar-context">
            <p className="department">{departmentName}</p>
            <span className="muted small">Authorized departmental workspace</span>
          </div>
          <div className="account">
            <span className="account-avatar" aria-hidden="true">{actorName.slice(0, 1).toUpperCase()}</span>
            <span className="account-name">{actorName}</span>
            {logout}
          </div>
        </header>
        <main id="main" className="page-content">{children}</main>
        <footer className="workspace-footer">SIH26018 · Secure land record digitization</footer>
      </div>
    </div>
  );
}
