import { AuditAction } from "@prisma/client";
import prisma from "./prisma.js";
import { isDemoMode } from "./demo.js";

export { AuditAction };

export async function logAuditEvent({ actor, action, entityType, entityId, summary }) {
  if (isDemoMode()) {
    // Skip audit logging in demo mode
    return;
  }
  
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