import "server-only";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db";
import { AppError } from "@/server/errors";
import {
  requireActor,
  requirePermission,
  lockActor,
} from "@/modules/identity/server/service";
import { appendAudit } from "@/modules/audit/server/writer";
import { scopedIds } from "@/modules/master-data/server/service";
import type { Actor } from "@/modules/identity/contracts";
import {
  parcelFiltersSchema,
  recordLinkProposalSchema,
  recordLinkReviewSchema,
  type GisLinkMutationResult,
  type GisParcel,
  type GisParcelsResult,
  type GisRecordLink,
} from "../contracts";

function parcelVisible(actor: Actor) {
  return sql`p.department_id=${actor.departmentId} AND di.jurisdiction_id IN (${scopedIds(actor)})`;
}

function recordVisible(actor: Actor) {
  return sql`lr.department_id=${actor.departmentId} AND rdi.jurisdiction_id IN (${scopedIds(actor)})`;
}

function iso(value: unknown) {
  return new Date(String(value)).toISOString();
}

function parcelSummary(row: Record<string, unknown>): GisParcel {
  return {
    id: String(row.id),
    parcelNumber: String(row.parcelNumber),
    village: String(row.village),
    tehsil: String(row.tehsil),
    district: String(row.district),
    state: String(row.state),
    sourceName: String(row.sourceName),
    sourceReference: String(row.sourceReference),
    sourceCrs: String(row.sourceCrs),
    targetCrs: String(row.targetCrs),
    geometry: (row.geometry ?? null) as GisParcel["geometry"],
    missingGeometryReason:
      row.missingGeometryReason === null || row.missingGeometryReason === undefined
        ? null
        : String(row.missingGeometryReason),
    provenance: (row.provenance ?? {}) as Record<string, unknown>,
    synthetic: Boolean(row.synthetic),
    createdAt: iso(row.createdAt),
  };
}

function linkSummary(row: Record<string, unknown>): GisRecordLink {
  return {
    id: String(row.id),
    parcelId: String(row.parcelId),
    parcelNumber: String(row.parcelNumber),
    recordId: String(row.recordId),
    recordDisplayId: String(row.recordDisplayId),
    recordVersionId: String(row.recordVersionId),
    recordVersion: Number(row.recordVersion),
    status: String(row.status) as GisRecordLink["status"],
    proposalReason: String(row.proposalReason),
    reviewReason:
      row.reviewReason === null || row.reviewReason === undefined
        ? null
        : String(row.reviewReason),
    proposedBy: String(row.proposedBy),
    reviewedBy:
      row.reviewedBy === null || row.reviewedBy === undefined
        ? null
        : String(row.reviewedBy),
    proposedAt: iso(row.proposedAt),
    reviewedAt:
      row.reviewedAt === null || row.reviewedAt === undefined
        ? null
        : iso(row.reviewedAt),
  };
}

const parcelColumns = sql`p.id,p.parcel_number AS "parcelNumber",p.source_name AS "sourceName",p.source_reference AS "sourceReference",
  p.source_crs AS "sourceCrs",p.target_crs AS "targetCrs",p.geometry,p.missing_geometry_reason AS "missingGeometryReason",
  p.provenance,p.synthetic,p.created_at AS "createdAt",
  vi.name AS village,t.name AS tehsil,di.name AS district,s.name AS state`;

const parcelJoins = sql`FROM gis_parcels p
  JOIN villages vi ON vi.id=p.village_id
  JOIN tehsils t ON t.id=vi.tehsil_id
  JOIN districts di ON di.id=t.district_id
  JOIN states s ON s.id=di.state_id`;

const linkJoins = sql`FROM gis_record_links l
  JOIN gis_parcels p ON p.id=l.parcel_id
  JOIN land_records lr ON lr.id=l.record_id
  JOIN land_record_versions v ON v.id=l.record_version_id
  JOIN villages rvi ON rvi.id=v.village_id
  JOIN tehsils rt ON rt.id=rvi.tehsil_id
  JOIN districts rdi ON rdi.id=rt.district_id`;

async function linksForParcels(actor: Actor, parcelIds: string[]) {
  if (!parcelIds.length) return [];
  const rows = await getDb().execute(
    sql`SELECT l.id,l.parcel_id AS "parcelId",p.parcel_number AS "parcelNumber",l.record_id AS "recordId",
        lr.display_id AS "recordDisplayId",l.record_version_id AS "recordVersionId",v.version AS "recordVersion",
        l.status,l.proposal_reason AS "proposalReason",l.review_reason AS "reviewReason",
        l.proposed_by AS "proposedBy",l.reviewed_by AS "reviewedBy",l.proposed_at AS "proposedAt",l.reviewed_at AS "reviewedAt"
        ${linkJoins}
        WHERE l.department_id=${actor.departmentId} AND rdi.jurisdiction_id IN (${scopedIds(actor)})
          AND p.id IN (${sql.join(parcelIds.map((id) => sql`${id}::uuid`), sql`, `)})
        ORDER BY l.updated_at DESC,l.id`,
  );
  return rows.rows.map((row) => linkSummary(row as Record<string, unknown>));
}

export async function listGisParcels(
  token: string | undefined,
  input: unknown = {},
): Promise<GisParcelsResult> {
  const actor = await requireActor(token);
  requirePermission(actor, "gis.read");
  const filters = parcelFiltersSchema.parse(input);
  const q = `%${filters.q.replace(/[\\%_]/g, "\\$&")}%`;
  const where = sql`${parcelVisible(actor)}
    AND (${filters.q}='' OR p.parcel_number ILIKE ${q} OR p.source_name ILIKE ${q} OR vi.name ILIKE ${q})
    ${filters.villageId ? sql`AND p.village_id=${filters.villageId}` : sql``}
    ${
      filters.geometry === "present"
        ? sql`AND p.geometry IS NOT NULL`
        : filters.geometry === "missing"
          ? sql`AND p.geometry IS NULL`
          : sql``
    }`;
  const db = getDb();
  const [rows, count] = await Promise.all([
    db.execute(
      sql`SELECT ${parcelColumns} ${parcelJoins} WHERE ${where}
          ORDER BY p.created_at DESC,p.id LIMIT 25 OFFSET ${(filters.page - 1) * 25}`,
    ),
    db.execute(sql`SELECT count(*)::int AS total ${parcelJoins} WHERE ${where}`),
  ]);
  const items = rows.rows.map((row) => parcelSummary(row as Record<string, unknown>));
  return {
    items,
    links: await linksForParcels(
      actor,
      items.map((parcel) => parcel.id),
    ),
    page: filters.page,
    page_size: 25,
    total: Number(count.rows[0].total),
  };
}

export async function proposeRecordLink(
  token: string | undefined,
  input: unknown,
  requestId: string,
): Promise<GisLinkMutationResult> {
  const actor = await requireActor(token);
  requirePermission(actor, "gis.link");
  const data = recordLinkProposalSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor, "gis.link");
    const parcel = await tx.execute(
      sql`SELECT p.id,p.parcel_number FROM gis_parcels p
          JOIN villages vi ON vi.id=p.village_id
          JOIN tehsils t ON t.id=vi.tehsil_id
          JOIN districts di ON di.id=t.district_id
          WHERE p.id=${data.parcelId} AND ${parcelVisible(actor)}
          FOR UPDATE OF p`,
    );
    if (!parcel.rows.length)
      throw new AppError(404, "NOT_FOUND", "GIS parcel not found.");
    const record = await tx.execute(
      sql`SELECT lr.id,lr.display_id,lr.current_version_id,v.id AS version_id,v.version
          FROM land_records lr
          JOIN land_record_versions v ON v.id=lr.current_version_id
          JOIN villages rvi ON rvi.id=v.village_id
          JOIN tehsils rt ON rt.id=rvi.tehsil_id
          JOIN districts rdi ON rdi.id=rt.district_id
          WHERE lr.id=${data.recordId} AND ${recordVisible(actor)}
          FOR UPDATE OF lr`,
    );
    if (!record.rows.length)
      throw new AppError(404, "NOT_FOUND", "Approved land record not found.");
    const current = record.rows[0] as Record<string, unknown>;
    const existing = await tx.execute(
      sql`SELECT id FROM gis_record_links
          WHERE parcel_id=${data.parcelId} AND record_id=${data.recordId}
            AND record_version_id=${String(current.version_id)}`,
    );
    if (existing.rows.length)
      throw new AppError(
        409,
        "GIS_LINK_ALREADY_EXISTS",
        "This parcel and record version already have a link proposal.",
      );
    const inserted = await tx.execute(
      sql`INSERT INTO gis_record_links(department_id,parcel_id,record_id,record_version_id,status,proposal_reason,proposed_by)
          VALUES(${actor.departmentId},${data.parcelId},${data.recordId},${String(current.version_id)},'PROPOSED',${data.reason},${actor.id})
          RETURNING id`,
    );
    const id = String((inserted.rows[0] as Record<string, unknown>).id);
    await tx.execute(
      sql`INSERT INTO gis_record_link_history(link_id,from_status,to_status,action,reason,actor_id)
          VALUES(${id},NULL,'PROPOSED','PROPOSED',${data.reason},${actor.id})`,
    );
    await appendAudit(tx, {
      actorId: actor.id,
      departmentId: actor.departmentId,
      action: "gis.record_link_proposed",
      entityId: id,
      requestId,
      details: {
        ...data,
        parcelNumber: String((parcel.rows[0] as Record<string, unknown>).parcel_number),
        recordDisplayId: String(current.display_id),
        recordVersionId: String(current.version_id),
        recordVersion: Number(current.version),
      },
    });
    return { id, status: "PROPOSED" };
  });
}

export async function reviewRecordLink(
  token: string | undefined,
  linkId: string,
  input: unknown,
  requestId: string,
): Promise<GisLinkMutationResult> {
  const actor = await requireActor(token);
  requirePermission(actor, "gis.review");
  z.uuid().parse(linkId);
  const data = recordLinkReviewSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor, "gis.review");
    const rows = await tx.execute(
      sql`SELECT l.id,l.status,l.parcel_id,l.record_id,l.record_version_id,p.parcel_number,lr.display_id
          ${linkJoins}
          WHERE l.id=${linkId} AND l.department_id=${actor.departmentId}
            AND rdi.jurisdiction_id IN (${scopedIds(actor)})
          FOR UPDATE OF l`,
    );
    if (!rows.rows.length)
      throw new AppError(404, "NOT_FOUND", "GIS record link not found.");
    const link = rows.rows[0] as Record<string, unknown>;
    if (String(link.status) !== "PROPOSED")
      throw new AppError(
        409,
        "GIS_LINK_ALREADY_REVIEWED",
        "This GIS record link was already reviewed.",
      );
    await tx.execute(
      sql`UPDATE gis_record_links SET status=${data.decision},review_reason=${data.reason},
          reviewed_by=${actor.id},reviewed_at=now(),updated_at=now() WHERE id=${linkId}`,
    );
    await tx.execute(
      sql`INSERT INTO gis_record_link_history(link_id,from_status,to_status,action,reason,actor_id)
          VALUES(${linkId},${String(link.status)},${data.decision},${data.decision},${data.reason},${actor.id})`,
    );
    await appendAudit(tx, {
      actorId: actor.id,
      departmentId: actor.departmentId,
      action: "gis.record_link_reviewed",
      entityId: linkId,
      requestId,
      details: {
        ...data,
        fromStatus: String(link.status),
        parcelId: String(link.parcel_id),
        parcelNumber: String(link.parcel_number),
        recordId: String(link.record_id),
        recordDisplayId: String(link.display_id),
        recordVersionId: String(link.record_version_id),
      },
    });
    return { id: linkId, status: data.decision };
  });
}
