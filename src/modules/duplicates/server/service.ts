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
import { duplicateResolutionSchema } from "../contracts";

function visible(actor: Actor) {
  return sql`d.department_id=${actor.departmentId} AND di.jurisdiction_id IN (${scopedIds(actor)})`;
}

export async function resolveDuplicate(
  token: string | undefined,
  candidateId: string,
  input: unknown,
  requestId: string,
) {
  const actor = await requireActor(token);
  requirePermission(actor, "duplicates.resolve");
  z.uuid().parse(candidateId);
  const data = duplicateResolutionSchema.parse(input);
  return getDb().transaction(async (tx) => {
    await lockActor(tx, token, actor, "duplicates.resolve");
    const result = await tx.execute(
      sql`SELECT dc.id,dc.status,dc.document_id,dc.candidate_document_id
          FROM duplicate_candidates dc
          JOIN documents d ON d.id=dc.document_id
          JOIN villages v ON v.id=d.village_id
          JOIN tehsils t ON t.id=v.tehsil_id
          JOIN districts di ON di.id=t.district_id
          WHERE dc.id=${candidateId} AND ${visible(actor)}
          FOR UPDATE OF dc`,
    );
    if (!result.rows.length)
      throw new AppError(404, "NOT_FOUND", "Duplicate candidate not found.");
    const candidate = result.rows[0] as {
      status: string;
      document_id: string;
      candidate_document_id: string;
    };
    if (candidate.status !== "PENDING")
      throw new AppError(
        409,
        "DUPLICATE_ALREADY_RESOLVED",
        "This duplicate candidate was already resolved.",
      );
    await tx.execute(
      sql`UPDATE duplicate_candidates SET status=${data.decision},resolution_reason=${data.reason},resolved_by=${actor.id},resolved_at=now() WHERE id=${candidateId}`,
    );
    await appendAudit(tx, {
      actorId: actor.id,
      departmentId: actor.departmentId,
      action: "duplicates.resolved",
      entityId: candidateId,
      requestId,
      details: {
        ...data,
        documentId: candidate.document_id,
        candidateDocumentId: candidate.candidate_document_id,
      },
    });
    return { id: candidateId, status: data.decision };
  });
}
