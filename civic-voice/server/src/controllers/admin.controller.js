import { z } from "zod";
import prisma from "../utils/prisma.js";
import { AuditAction, logAuditEvent } from "../utils/audit.js";

const statusSchema = z.object({
  status: z.enum(["REPORTED", "IN_PROGRESS", "RESOLVED"]),
});

const resolveSchema = z.object({
  resolutionProofImages: z.array(z.string().url()).default([]),
});

function getAdminLocationFilter(admin) {
  if (!admin.country || !admin.state || !admin.district || !admin.cityVillage) {
    return null;
  }

  return {
    country: admin.country,
    state: admin.state,
    district: admin.district,
    cityVillage: admin.cityVillage,
  };
}

async function getIssueForAdminLocation(problemId, admin) {
  const locationFilter = getAdminLocationFilter(admin);

  if (!locationFilter) {
    return null;
  }

  return prisma.problem.findFirst({
    where: {
      id: problemId,
      ...locationFilter,
    },
  });
}

export async function listModerationQueue(req, res) {
  const admin = req.user;
  const locationFilter = getAdminLocationFilter(admin);

  if (!locationFilter) {
    return res.status(400).json({ message: "Set your full admin location before opening moderation" });
  }

  const posts = await prisma.problem.findMany({
    where: locationFilter,
    include: {
      _count: { select: { reports: true, upvotes: true, comments: true } },
      reports: {
        take: 3,
        orderBy: { createdAt: "desc" },
        select: { id: true, reason: true, createdAt: true },
      },
    },
    orderBy: [{ reports: { _count: "desc" } }, { createdAt: "desc" }],
  });

  return res.json(posts);
}

export async function updateIssueStatus(req, res) {
  const payload = statusSchema.parse(req.body);
  const { id } = req.params;

  const issue = await getIssueForAdminLocation(id, req.user);

  if (!issue) {
    return res.status(404).json({ message: "Issue not found in your assigned location" });
  }

  const updated = await prisma.problem.update({
    where: { id },
    data: { status: payload.status },
  });

  await logAuditEvent({
    actor: req.user,
    action: AuditAction.ISSUE_STATUS_UPDATED,
    entityType: "PROBLEM",
    entityId: updated.id,
    summary: `${req.user.mobile || "Unknown admin"} changed issue ${updated.id} status to ${updated.status}`,
  });

  return res.json(updated);
}

export async function resolveIssue(req, res) {
  const payload = resolveSchema.parse(req.body);
  const { id } = req.params;

  const issue = await getIssueForAdminLocation(id, req.user);

  if (!issue) {
    return res.status(404).json({ message: "Issue not found in your assigned location" });
  }

  const updated = await prisma.problem.update({
    where: { id },
    data: {
      status: "RESOLVED",
      resolutionProofImages: payload.resolutionProofImages,
      resolvedAt: new Date(),
    },
  });

  await logAuditEvent({
    actor: req.user,
    action: AuditAction.ISSUE_RESOLVED,
    entityType: "PROBLEM",
    entityId: updated.id,
    summary: `${req.user.mobile || "Unknown admin"} resolved issue ${updated.id}`,
  });

  return res.json(updated);
}
