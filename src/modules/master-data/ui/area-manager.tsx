"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/shared/api-client";
import type { MasterTree } from "../contracts";
export function AreaManager({
  tree,
  scopes,
  csrfToken,
}: {
  tree: MasterTree;
  scopes: { id: string; name: string }[];
  csrfToken: string;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"state" | "district" | "tehsil" | "village">(
    "village",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const parents =
    kind === "district"
      ? tree.states
      : kind === "tehsil"
        ? tree.districts
        : kind === "village"
          ? tree.tehsils
          : [];
  return (
    <>
      <form
        className="panel"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          setBusy(true);
          setMessage("");
          try {
            await api("/api/v1/master-data", {
              method: "POST",
              csrfToken,
              body: {
                kind,
                name: data.get("name"),
                code: data.get("code"),
                ...(kind !== "state" ? { parentId: data.get("parentId") } : {}),
                ...(kind === "district"
                  ? { jurisdictionId: data.get("jurisdictionId") }
                  : {}),
              },
            });
            form.reset();
            setMessage("Administrative area created.");
            router.refresh();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Save failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>Add administrative area</h2>
        <div className="form-grid">
          <label>
            Level
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
            >
              <option value="state">State</option>
              <option value="district">District</option>
              <option value="tehsil">Tehsil</option>
              <option value="village">Village</option>
            </select>
          </label>
          {kind !== "state" && (
            <label>
              Parent area
              <select name="parentId" key={kind} required>
                <option value="">Choose parent</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </label>
          )}
          {kind === "district" && (
            <label>
              Jurisdiction scope
              <select name="jurisdictionId" required>
                <option value="">Choose assigned scope</option>
                {scopes
                  .filter(
                    (s) =>
                      !tree.districts.some((d) => d.jurisdictionId === s.id),
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label>
            Name
            <input name="name" required minLength={2} maxLength={120} />
          </label>
          <label>
            Code
            <input
              name="code"
              required
              pattern="[A-Z0-9_-]{2,30}"
              title="2–30 uppercase letters, digits, hyphens or underscores"
              maxLength={30}
            />
          </label>
        </div>
        <p className="small muted">
          States require access to every department jurisdiction. Districts map
          to existing assigned scopes. Existing hierarchy entries are preserved.
        </p>
        <button className="button primary" disabled={busy}>
          {busy ? "Saving…" : "Create area"}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
      <section className="panel editor">
        <h2>Administrative hierarchy</h2>
        {tree.states.map((state) => (
          <div key={state.id} className="history-entry">
            <strong>
              {state.name} · {state.code}
            </strong>
            {tree.districts
              .filter((d) => d.stateId === state.id)
              .map((d) => (
                <details key={d.id} open>
                  <summary>
                    {d.name} · {d.code}
                  </summary>
                  {tree.tehsils
                    .filter((t) => t.districtId === d.id)
                    .map((t) => (
                      <div key={t.id} className="hierarchy-child">
                        <strong>{t.name}</strong>
                        <ul>
                          {tree.villages
                            .filter((v) => v.tehsilId === t.id)
                            .map((v) => (
                              <li key={v.id}>
                                {v.name}{" "}
                                <span className="muted">({v.code})</span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))}
                </details>
              ))}
          </div>
        ))}
      </section>
    </>
  );
}
