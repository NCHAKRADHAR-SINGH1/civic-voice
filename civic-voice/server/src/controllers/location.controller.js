import { z } from "zod";
import prisma from "../utils/prisma.js";
import { serializeUser } from "../utils/auth.js";
import { AuditAction, logAuditEvent } from "../utils/audit.js";
import { getAdminAssignmentByMobile } from "../utils/admin-access.js";

const locationSchema = z.object({
  country: z.string().trim().min(2),
  state: z.string().trim().min(2),
  district: z.string().trim().min(2),
  cityVillage: z.string().trim().min(2),
});

export async function updatePrimaryLocation(req, res) {
  const payload = locationSchema.parse(req.body);
  const cooldownDays = Number(
    process.env.LOCATION_CHANGE_COOLDOWN_DAYS ||
    (process.env.LOCATION_CHANGE_COOLDOWN_MONTHS ? Number(process.env.LOCATION_CHANGE_COOLDOWN_MONTHS) * 30 : 30)
  );
  const user = req.user;
  const adminAssignment = user.role === "ADMIN" ? getAdminAssignmentByMobile(user.mobile) : null;

  if (user.role === "ADMIN" && !adminAssignment) {
    return res.status(403).json({ message: "Admin location assignment is missing" });
  }

  const nextLocation = adminAssignment ? adminAssignment.location : payload;

  if (user.locationUpdatedAt) {
    const nextAllowed = new Date(user.locationUpdatedAt);
    nextAllowed.setDate(nextAllowed.getDate() + cooldownDays);
    if (nextAllowed > new Date()) {
      return res.status(400).json({
        message: `Location can be changed only once every ${cooldownDays} day(s)`,
        nextAllowedAt: nextAllowed,
      });
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...nextLocation,
      locationUpdatedAt: new Date(),
    },
  });

  await logAuditEvent({
    actor: updated,
    action: AuditAction.LOCATION_UPDATED,
    entityType: "USER",
    entityId: updated.id,
    summary: `${updated.mobile || "Unknown user"} updated location to ${nextLocation.cityVillage}, ${nextLocation.district}, ${nextLocation.state}`,
  });

  return res.json({
    message: "Primary location updated",
    user: serializeUser(updated),
  });
}
