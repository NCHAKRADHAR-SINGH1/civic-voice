import { z } from "zod";
import prisma from "../utils/prisma.js";
import { serializeUser } from "../utils/auth.js";
import { AuditAction, logAuditEvent } from "../utils/audit.js";
import { isDemoMode, updateDemoUser } from "../utils/demo.js";

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

  if (user.role === "ADMIN") {
    return res.status(403).json({ message: "Admin location is managed by admin secret code" });
  }

  const nextLocation = payload;

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

  const updated = isDemoMode()
    ? updateDemoUser(user.mobile, {
      ...nextLocation,
      locationUpdatedAt: new Date(),
    })
    : await prisma.user.update({
      where: { id: user.id },
      data: {
        ...nextLocation,
        locationUpdatedAt: new Date(),
      },
    });

  if (!updated) {
    return res.status(404).json({ message: "Unable to update primary location for current user" });
  }

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
