"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/shared/api-client";
import type { GisRecordLink } from "../contracts";
import type { LandRecordSummary } from "@/modules/land-records/contracts";
import type { GisParcel } from "../contracts";

export function GisLinkWorkbench({
  parcels,
  records,
  links,
  csrfToken,
  canLink,
  canReview,
}: {
  parcels: GisParcel[];
  records: LandRecordSummary[];
  links: GisRecordLink[];
  csrfToken: string;
  canLink: boolean;
  canReview: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = links.filter((link) => link.status === "PROPOSED");

  async function submit(
    action: "propose" | "review",
    body: unknown,
    linkId?: string,
  ) {
    setBusy(true);
    setMessage("");
    try {
      await api(
        action === "propose"
          ? "/api/v1/gis/record-links"
          : `/api/v1/gis/record-links/${linkId}/review`,
        {
        method: "POST",
        csrfToken,
        body,
        },
      );
      setMessage(action === "propose" ? "Link proposal submitted." : "Link review saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h2>Record-to-parcel links</h2>
      <p className="muted">
        Proposals pin the approved record version. A separate reviewer approves
        or rejects the link; no link is treated as authoritative until review.
      </p>
      <div className="form-grid">
        {canLink && (
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void submit("propose", {
                parcelId: form.get("parcelId"),
                recordId: form.get("recordId"),
                reason: form.get("reason"),
              });
            }}
          >
            <h3>Propose a link</h3>
            <label>
              Parcel
              <select name="parcelId" required>
                {parcels.map((parcel) => (
                  <option key={parcel.id} value={parcel.id}>
                    {parcel.parcelNumber} · {parcel.village}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Approved record
              <select name="recordId" required>
                {records.map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.displayId} · v{record.version} · {record.ownerName ?? "Owner unavailable"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reason
              <input name="reason" required minLength={3} maxLength={500} />
            </label>
            <button className="button primary" disabled={busy || !parcels.length || !records.length}>
              Submit proposal
            </button>
          </form>
        )}
        {canReview && (
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void submit(
                "review",
                {
                  decision: form.get("decision"),
                  reason: form.get("reason"),
                },
                String(form.get("linkId")),
              );
            }}
          >
            <h3>Review a proposal</h3>
            <label>
              Proposal
              <select name="linkId" required>
                {pending.map((link) => (
                  <option key={link.id} value={link.id}>
                    {link.parcelNumber} → {link.recordDisplayId} v{link.recordVersion}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Decision
              <select name="decision" required>
                <option value="APPROVED">Approve</option>
                <option value="REJECTED">Reject</option>
              </select>
            </label>
            <label>
              Reason
              <input name="reason" required minLength={3} maxLength={500} />
            </label>
            <button className="button primary" disabled={busy || !pending.length}>
              Save review
            </button>
          </form>
        )}
      </div>
      {!canLink && !canReview && (
        <p className="empty">Your role can view parcels and links but cannot change them.</p>
      )}
      {message && <p role="status">{message}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Parcel</th>
              <th>Record</th>
              <th>Status</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id}>
                <td>{link.parcelNumber}</td>
                <td>
                  {link.recordDisplayId}
                  <span className="cell-secondary">Version {link.recordVersion}</span>
                </td>
                <td>
                  <span className={`tag ${link.status === "APPROVED" ? "success" : link.status === "REJECTED" ? "danger" : "neutral"}`}>
                    {link.status}
                  </span>
                </td>
                <td>{link.reviewReason ?? link.proposalReason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!links.length && <p className="empty">No record links for the parcels on this page.</p>}
      </div>
    </div>
  );
}
