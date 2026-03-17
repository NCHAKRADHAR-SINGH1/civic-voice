import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../utils/prisma.js";
import { AuditAction, logAuditEvent } from "../utils/audit.js";

const createIssueSchema = z.object({
  title: z.string().min(4).max(140),
  description: z.string().min(10).max(4000),
  category: z.string().min(3).max(50),
  imageUrl: z.string().url().optional(),
  departmentTag: z.string().min(2).max(60).optional(),
});

const listIssueQuerySchema = z.object({
  sort: z.enum(["recent", "upvoted"]).default("upvoted"),
  category: z.string().optional(),
  q: z.string().optional(),
});

const commentSchema = z.object({
  text: z.string().trim().max(1000).optional(),
  imageUrl: z.string().url().optional(),
}).refine((value) => Boolean(value.text) || Boolean(value.imageUrl), {
  message: "Comment text or image is required",
});

const spamSchema = z.object({
  reason: z.string().min(3).max(200),
});

function userLocationFilter(user) {
  return {
    country: user.country,
    state: user.state,
    district: user.district,
    cityVillage: user.cityVillage,
  };
}

function normalizeLocationValue(value) {
  return String(value || "").trim().toLowerCase();
}

function locationWhereFilterInsensitive(location) {
  return {
    country: { equals: normalizeLocationValue(location.country), mode: Prisma.QueryMode.insensitive },
    state: { equals: normalizeLocationValue(location.state), mode: Prisma.QueryMode.insensitive },
    district: { equals: normalizeLocationValue(location.district), mode: Prisma.QueryMode.insensitive },
    cityVillage: { equals: normalizeLocationValue(location.cityVillage), mode: Prisma.QueryMode.insensitive },
  };
}

function isSameLocation(issue, user) {
  return (
    normalizeLocationValue(issue.country) === normalizeLocationValue(user.country) &&
    normalizeLocationValue(issue.state) === normalizeLocationValue(user.state) &&
    normalizeLocationValue(issue.district) === normalizeLocationValue(user.district) &&
    normalizeLocationValue(issue.cityVillage) === normalizeLocationValue(user.cityVillage)
  );
}

async function getIssueForUserLocation(problemId, user) {
  return prisma.problem.findFirst({
    where: {
      id: problemId,
      ...locationWhereFilterInsensitive(userLocationFilter(user)),
    },
  });
}

export async function createIssue(req, res) {
  const payload = createIssueSchema.parse(req.body);
  const user = req.user;

  if (!user.country || !user.state || !user.district || !user.cityVillage) {
    return res.status(400).json({ message: "Set primary location before posting" });
  }

  const issue = await prisma.problem.create({
    data: {
      title: payload.title,
      description: payload.description,
      category: payload.category,
      imageUrl: payload.imageUrl,
      departmentTag: payload.departmentTag,
      ...userLocationFilter(user),
      userId: user.id,
    },
  });

  await logAuditEvent({
    actor: user,
    action: AuditAction.ISSUE_CREATED,
    entityType: "PROBLEM",
    entityId: issue.id,
    summary: `${user.mobile || "Unknown user"} created issue "${issue.title}"`,
  });

  return res.status(201).json(issue);
}

export async function listIssues(req, res) {
  const user = req.user;
  const query = listIssueQuerySchema.parse(req.query);

  if (!user.country || !user.state || !user.district || !user.cityVillage) {
    return res.status(400).json({ message: "Set primary location before viewing dashboard" });
  }

  const where = {
    ...locationWhereFilterInsensitive(userLocationFilter(user)),
    ...(query.category ? { category: query.category } : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
            { description: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {}),
  };

  const issues = await prisma.problem.findMany({
    where,
    include: {
      _count: { select: { upvotes: true, comments: true, reports: true } },
      comments: {
        select: {
          id: true,
          text: true,
          imageUrl: true,
          createdAt: true,
          user: { select: { id: true, mobile: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      user: { select: { id: true, mobile: true } },
      upvotes: { where: { userId: user.id }, select: { id: true } },
    },
    orderBy: query.sort === "recent" ? [{ createdAt: "desc" }] : [{ upvotes: { _count: "desc" } }, { createdAt: "desc" }],
  });

  return res.json(
    issues.map((i) => ({
      ...i,
      currentUserUpvoted: i.upvotes.length > 0,
      isInUserLocation: isSameLocation(i, user),
    }))
  );
}

export async function upvoteIssue(req, res) {
  const { id } = req.params;
  const issue = await getIssueForUserLocation(id, req.user);

  if (!issue) {
    return res.status(404).json({ message: "Issue not found in your location" });
  }

  if (issue.status === "RESOLVED") {
    return res.status(400).json({ message: "Cannot upvote resolved issue" });
  }

  if (issue.userId === req.user.id) {
    return res.status(400).json({ message: "Cannot upvote your own issue" });
  }

  try {
    await prisma.upvote.create({
      data: {
        userId: req.user.id,
        problemId: id,
      },
    });

    await logAuditEvent({
      actor: req.user,
      action: AuditAction.ISSUE_UPVOTED,
      entityType: "PROBLEM",
      entityId: id,
      summary: `${req.user.mobile || "Unknown user"} upvoted issue ${id}`,
    });

    return res.json({ message: "Upvoted" });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Already upvoted" });
    }

    throw error;
  }
}

export async function addComment(req, res) {
  const { id } = req.params;
  const payload = commentSchema.parse(req.body);
  const issue = await getIssueForUserLocation(id, req.user);

  if (!issue) {
    return res.status(404).json({ message: "Issue not found in your location" });
  }

  const comment = await prisma.comment.create({
    data: {
      text: payload.text || null,
      imageUrl: payload.imageUrl,
      userId: req.user.id,
      problemId: id,
    },
  });

  await logAuditEvent({
    actor: req.user,
    action: AuditAction.COMMENT_ADDED,
    entityType: "PROBLEM",
    entityId: id,
    summary: `${req.user.mobile || "Unknown user"} commented on issue ${id}`,
  });

  return res.status(201).json(comment);
}

export async function reportSpam(req, res) {
  const { id } = req.params;
  const payload = spamSchema.parse(req.body);
  const issue = await getIssueForUserLocation(id, req.user);

  if (!issue) {
    return res.status(404).json({ message: "Issue not found in your location" });
  }

  try {
    const report = await prisma.spamReport.create({
      data: {
        reason: payload.reason,
        userId: req.user.id,
        problemId: id,
      },
    });

    await logAuditEvent({
      actor: req.user,
      action: AuditAction.ISSUE_REPORTED,
      entityType: "PROBLEM",
      entityId: id,
      summary: `${req.user.mobile || "Unknown user"} reported issue ${id}`,
    });

    return res.status(201).json(report);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Already reported" });
    }

    throw error;
  }
}

export async function getIssuesByLocation(req, res) {
  const locationSchema = z.object({
    state: z.string().trim().min(2),
    district: z.string().trim().min(2),
    cityVillage: z.string().trim().min(2),
  });
  
  const location = locationSchema.parse(req.query);
  const user = req.user;

  const issues = await prisma.problem.findMany({
    where: {
      ...locationWhereFilterInsensitive({
        country: "India",
        state: location.state,
        district: location.district,
        cityVillage: location.cityVillage,
      }),
    },
    include: {
      _count: { select: { upvotes: true, comments: true, reports: true } },
      comments: {
        select: {
          id: true,
          text: true,
          imageUrl: true,
          createdAt: true,
          user: { select: { id: true, mobile: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      user: { select: { id: true, mobile: true } },
      upvotes: { where: { userId: user.id }, select: { id: true } },
    },
    orderBy: [{ upvotes: { _count: "desc" } }, { createdAt: "desc" }],
  });

  return res.json(
    issues.map((i) => ({
      ...i,
      currentUserUpvoted: i.upvotes.length > 0,
    }))
  );
}

export async function trendingIssues(req, res) {
  const user = req.user;

  if (!user.country || !user.state || !user.district || !user.cityVillage) {
    return res.status(400).json({ message: "Set primary location before viewing trends" });
  }

  const issues = await prisma.problem.findMany({
    where: locationWhereFilterInsensitive(userLocationFilter(user)),
    include: {
      _count: { select: { upvotes: true, comments: true, reports: true } },
    },
    orderBy: { upvotes: { _count: "desc" } },
    take: 5,
  });

  return res.json(issues);
}
