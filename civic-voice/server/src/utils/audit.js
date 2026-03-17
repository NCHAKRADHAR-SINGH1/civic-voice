import { AuditAction } from "@prisma/client";
import prisma from "./prisma.js";

export { AuditAction };

export async function logAuditEvent({ actor, action, entityType, entityId, summary }) {
  await prisma.auditLog.create({
    data: {
      action,
      actorId: actor?.id,
      actorRole: actor?.role,
      entityType,
      entityId,
      summary,
    },
  });
}