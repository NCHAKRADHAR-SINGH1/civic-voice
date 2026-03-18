import { z } from "zod";
import prisma from "../utils/prisma.js";
import { AuditAction, logAuditEvent } from "../utils/audit.js";
import { normalizeMobileNumber } from "../utils/admin-access.js";
import { isDemoMode } from "../utils/demo.js";

const auditLogQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  role: z.enum(["CITIZEN", "ADMIN", "OWNER"]).optional(),
  action: z.nativeEnum(AuditAction).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

const adminAccessSchema = z.object({
  mobile: z.string().min(10),
  disabled: z.boolean(),
});

function parseDateBoundary(value, endOfDay = false) {
  if (!value) {
    return null;
  }

  const normalized = endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export async function listAuditLogs(req, res) {
  if (isDemoMode()) {
    return res.json([]);
  }

  const query = auditLogQuerySchema.parse(req.query);
  const where = {};

  if (query.role) {
    where.actorRole = query.role;
  }

  if (query.action) {
    where.action = query.action;
  }

  const fromDate = parseDateBoundary(query.from, false);
  const toDate = parseDateBoundary(query.to, true);

  if ((query.from && !fromDate) || (query.to && !toDate)) {
    return res.status(400).json({ message: "Invalid date filter" });
  }

  if (fromDate || toDate) {
    where.createdAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  if (query.q) {
    where.OR = [
      { summary: { contains: query.q, mode: "insensitive" } },
      { entityId: { contains: query.q, mode: "insensitive" } },
      { actor: { is: { mobile: { contains: query.q, mode: "insensitive" } } } },
    ];
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      actor: {
        select: {
          id: true,
          mobile: true,
          role: true,
          state: true,
          district: true,
          cityVillage: true,
          adminAccessDisabledAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: query.limit,
  });

  return res.json(logs);
}

export async function listAdmins(_req, res) {
  if (isDemoMode()) {
    return res.json([]);
  }

  const users = await prisma.user.findMany({
    where: {
      role: "ADMIN",
    },
    orderBy: { updatedAt: "desc" },
    select: {
      mobile: true,
      country: true,
      state: true,
      district: true,
      cityVillage: true,
      role: true,
      adminAccessDisabledAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const admins = users
    .filter((user) => Boolean(user.mobile))
    .map((user) => ({
      mobile: normalizeMobileNumber(user.mobile),
      location: {
        country: user.country || "India",
        state: user.state || "Not set",
        district: user.district || "Not set",
        cityVillage: user.cityVillage || "Not set",
      },
      hasAccount: true,
      role: user.role || null,
      adminAccessDisabledAt: user.adminAccessDisabledAt || null,
      createdAt: user.createdAt || null,
      updatedAt: user.updatedAt || null,
    }));

  return res.json(admins);
}

export async function updateAdminAccess(req, res) {
  const payload = adminAccessSchema.parse(req.body);
  const normalizedMobile = normalizeMobileNumber(payload.mobile);

  const user = await prisma.user.findFirst({
    where: {
      mobile: normalizedMobile,
      role: "ADMIN",
    },
  });

  if (!user) {
    return res.status(404).json({ message: "Admin account not found for this mobile" });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      adminAccessDisabledAt: payload.disabled ? new Date() : null,
    },
  });

  await logAuditEvent({
    actor: req.user,
    action: AuditAction.ADMIN_ACCESS_UPDATED,
    entityType: "USER",
    entityId: updated.id,
    summary: `${req.user.mobile || "Owner"} ${payload.disabled ? "disabled" : "enabled"} admin access for ${normalizedMobile}`,
  });

  return res.json({
    mobile: updated.mobile,
    adminAccessDisabledAt: updated.adminAccessDisabledAt,
    role: updated.role,
  });
}