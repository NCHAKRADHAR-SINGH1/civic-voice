import { AuthMethod } from "@prisma/client";
import { z } from "zod";
import prisma from "../utils/prisma.js";
import { clearAuthCookie, generateToken, serializeUser, setAuthCookie } from "../utils/auth.js";
import { verifyFirebaseIdToken } from "../utils/firebase-admin.js";
import { AuditAction, logAuditEvent } from "../utils/audit.js";
import { canUserRequestAdminRole, getAdminAssignmentByMobile, normalizeMobileNumber } from "../utils/admin-access.js";
import { isOwnerMobile } from "../utils/admin-access.js";

const verifyOtpSchema = z.object({
  identifier: z.string().min(10),
  firebaseIdToken: z.string().min(20),
});

const roleSchema = z.object({
  role: z.enum(["CITIZEN", "ADMIN"]),
  adminCode: z.string().optional(),
});

function serializeUserWithAccess(user) {
  return {
    ...serializeUser(user),
    canRequestAdminRole: canUserRequestAdminRole(user.mobile),
  };
}

export async function verifyOtp(req, res) {
  const payload = verifyOtpSchema.parse(req.body);
  const normalizedIdentifier = normalizeMobileNumber(payload.identifier);
  const decodedToken = await verifyFirebaseIdToken(payload.firebaseIdToken);
  const normalizedFromToken = normalizeMobileNumber(decodedToken.phone_number || "");

  if (!normalizedFromToken || normalizedFromToken !== normalizedIdentifier) {
    return res.status(400).json({ message: "Firebase phone number mismatch" });
  }

  const authMethod = AuthMethod.MOBILE;

  let user = await prisma.user.findFirst({
    where: { mobile: normalizedIdentifier },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        authMethod,
        mobile: normalizedFromToken,
      },
    });
  }

  if (isOwnerMobile(normalizedIdentifier) && user.role !== "OWNER") {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: "OWNER" },
    });
  }

  const token = generateToken(user);
  setAuthCookie(res, token);

  await logAuditEvent({
    actor: user,
    action: AuditAction.AUTHENTICATED,
    entityType: "USER",
    entityId: user.id,
    summary: `${user.mobile || "Unknown user"} authenticated with phone OTP`,
  });

  return res.json({
    message: "Authenticated",
    user: serializeUserWithAccess(user),
  });
}

export async function getSession(req, res) {
  return res.json({ user: serializeUserWithAccess(req.user) });
}

export async function logout(_req, res) {
  clearAuthCookie(res);
  return res.status(204).send();
}

export async function setUserRole(req, res) {
  const payload = roleSchema.parse(req.body);
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Prevent self-promotion to admin without secret invite code
  if (payload.role === "ADMIN") {
    const assignment = getAdminAssignmentByMobile(user.mobile);

    if (!assignment) {
      return res.status(403).json({ message: "This mobile number is not approved for admin access" });
    }

    if (user.adminAccessDisabledAt) {
      return res.status(403).json({ message: "Admin access has been disabled for this account" });
    }

    if (!payload.adminCode || payload.adminCode !== assignment.inviteCode) {
      return res.status(403).json({ message: "Invalid admin code" });
    }
  }

  const adminAssignment = payload.role === "ADMIN" ? getAdminAssignmentByMobile(user.mobile) : null;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      role: payload.role,
      ...(adminAssignment ? adminAssignment.location : {}),
    },
  });

  await logAuditEvent({
    actor: updated,
    action: AuditAction.ROLE_UPDATED,
    entityType: "USER",
    entityId: updated.id,
    summary: `${updated.mobile || "Unknown user"} changed role to ${updated.role}`,
  });

  return res.json({
    message: "Role updated",
    user: serializeUserWithAccess(updated),
  });
}
