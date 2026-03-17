import { z } from "zod";
import prisma from "../utils/prisma.js";
import { AuditAction, logAuditEvent } from "../utils/audit.js";
import { getAdminAssignmentByMobile, getAdminAssignments, normalizeMobileNumber } from "../utils/admin-access.js";

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
  const assignments = getAdminAssignments();
  const users = await prisma.user.findMany({
    where: {
      mobile: {
        in: assignments.map((entry) => entry.mobile),
      },
    },
    select: {
      id: true,
      mobile: true,
      role: true,
      adminAccessDisabledAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const userByMobile = new Map(users.map((user) => [normalizeMobileNumber(user.mobile || ""), user]));

  const admins = assignments.map((entry) => {
    const user = userByMobile.get(entry.mobile);
    return {
      mobile: entry.mobile,
      location: entry.location,
      hasAccount: Boolean(user),
      role: user?.role || null,
      adminAccessDisabledAt: user?.adminAccessDisabledAt || null,
      createdAt: user?.createdAt || null,
      updatedAt: user?.updatedAt || null,
    };
  });

  return res.json(admins);
}

export async function updateAdminAccess(req, res) {
  const payload = adminAccessSchema.parse(req.body);
  const normalizedMobile = normalizeMobileNumber(payload.mobile);
  const assignment = getAdminAssignmentByMobile(normalizedMobile);

  if (!assignment) {
    return res.status(404).json({ message: "Admin assignment not found for this mobile" });
  }

  const user = await prisma.user.findFirst({
    where: { mobile: normalizedMobile },
  });

  if (!user) {
    return res.status(404).json({ message: "Admin account not onboarded yet" });
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