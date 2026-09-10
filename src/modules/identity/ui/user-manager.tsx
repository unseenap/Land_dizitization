"use client";
import { useState } from "react";
import type { Actor } from "../contracts";
import { roleCodes } from "../contracts";
import { api } from "@/shared/api-client";
type User = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  revision: number;
  roles: string[];
  scopeIds: string[];
};
type Result = { items: User[]; page: number; total: number; page_size: number };
export function UserManager({
  initial,
  actor,
  csrfToken,
}: {
  initial: Result;
  actor: Actor;
  csrfToken: string;
}) {
  const [data, setData] = useState(initial),
    [editing, setEditing] = useState<User | null>(null),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function reload(page = data.page) {
    setData(await api<Result>(`/api/v1/users?page=${page}`));
  }
  return (
    <>
      <div className="toolbar">
        <p>{data.total} accounts in your scope</p>
        <button
          className="button primary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
            setError("");
            setMessage("");
          }}
        >
          Add user
        </button>
      </div>
      {message && (
        <p role="status" className="success-message">
          {message}
        </p>
      )}
      {error && !open && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {open && (
        <section
          className="panel editor"
          aria-label={editing ? "Edit user" : "Add user"}
        >
          <div className="section-title">
            <h2>{editing ? "Edit access" : "Add a department user"}</h2>
            <button
              className="button subtle"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
          <form
            key={editing?.id ?? "new"}
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError("");
              setMessage("");
              const form = new FormData(event.currentTarget);
              const common = {
                role: form.get("role"),
                scopeIds: form.getAll("scopeIds"),
              };
              try {
                if (editing) {
                  await api(`/api/v1/users/${editing.id}`, {
                    method: "PATCH",
                    csrfToken,
                    body: {
                      ...common,
                      expectedRevision: editing.revision,
                      active: form.get("active") === "on",
                    },
                  });
                } else {
                  await api("/api/v1/users", {
                    method: "POST",
                    csrfToken,
                    body: {
                      ...common,
                      name: form.get("name"),
                      email: form.get("email"),
                      password: form.get("password"),
                    },
                  });
                }
                await reload();
                setOpen(false);
                setMessage(
                  editing
                    ? "Access updated. Existing sessions were revoked."
                    : "User created. Share the initial password securely.",
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {!editing && (
              <div className="form-grid">
                <label>
                  Full name
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="off"
                  />
                </label>
                <label>
                  Email address
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="off"
                  />
                </label>
                <label>
                  Initial password
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                  />
                  <span className="small muted">At least 12 characters.</span>
                </label>
              </div>
            )}
            {editing && (
              <p className="muted">
                {editing.name} · {editing.email}
              </p>
            )}
            <div className="form-grid">
              <label>
                Role
                <select
                  name="role"
                  defaultValue={editing?.roles[0] ?? "operator"}
                >
                  {roleCodes.map((role) => (
                    <option key={role} value={role}>
                      {role.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend>Jurisdictions</legend>
                {actor.scopes.map((scope) => (
                  <label className="check-label" key={scope.id}>
                    <input
                      type="checkbox"
                      name="scopeIds"
                      value={scope.id}
                      defaultChecked={
                        editing ? editing.scopeIds.includes(scope.id) : true
                      }
                    />
                    {scope.name}
                  </label>
                ))}
              </fieldset>
            </div>
            {editing && (
              <label className="check-label">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={editing.active}
                />
                Account active
              </label>
            )}
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
            <button className="button primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save access" : "Create user"}
            </button>
          </form>
        </section>
      )}
      <div className="table-wrap">
        <table>
          <caption className="sr-only">Department user accounts</caption>
          <thead>
            <tr>
              <th>Name / email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  <span className="cell-secondary">{user.email}</span>
                </td>
                <td className="capitalize">
                  {user.roles.map((r) => r.replaceAll("_", " ")).join(", ")}
                </td>
                <td>
                  <span className={`tag ${user.active ? "" : "neutral"}`}>
                    {user.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  {user.id === actor.id ? (
                    <span className="muted small">Your account</span>
                  ) : (
                    <button
                      className="button subtle"
                      onClick={() => {
                        setEditing(user);
                        setOpen(true);
                        setError("");
                        setMessage("");
                      }}
                    >
                      Edit access
                      <span className="sr-only"> for {user.name}</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.items.length && <p className="empty">No users in your scope.</p>}
      </div>
      <div className="pagination">
        <button
          className="button"
          disabled={data.page === 1 || busy}
          onClick={async () => {
            try {
              await reload(data.page - 1);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Previous
        </button>
        <span>
          Page {data.page} of {Math.max(1, Math.ceil(data.total / 25))}
        </span>
        <button
          className="button"
          disabled={data.page * 25 >= data.total || busy}
          onClick={async () => {
            try {
              await reload(data.page + 1);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Next
        </button>
      </div>
    </>
  );
}
