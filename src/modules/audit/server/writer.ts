import "server-only";
import { auditLogs } from "../../../../database/schema";
import type { Transaction } from "@/server/db";

export async function appendAudit(
  tx: Transaction,
  event: {
    departmentId?: string;
    actorId?: string;
    action: string;
    entityId?: string;
    requestId: string;
    details?: Record<string, unknown>;
  },
) {
  await tx.insert(auditLogs).values({ ...event, details: event.details ?? {} });
}
