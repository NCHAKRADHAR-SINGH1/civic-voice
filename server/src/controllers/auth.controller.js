import { AuthMethod, Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../utils/prisma.js";
import { clearAuthCookie, generateToken, serializeUser, setAuthCookie } from "../utils/auth.js";
import { AuditAction, logAuditEvent } from "../utils/audit.js";
import { normalizeMobileNumber, parseAdminSecretCode } from "../utils/admin-access.js";
import { isOwnerMobile } from "../utils/admin-access.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { isDemoMode, getDemoUser, setDemoUser, updateDemoUser } from "../utils/demo.js";
import { generateAndSendOtp, verifyOtp, clearOtp } from "../utils/otp.js";

const sendPasswordResetOtpSchema = z.object({
  identifier: z.string().min(10),
});

const registerWithPasswordSchema = z.object({
  identifier: z.string().min(10),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Password and confirm password must match",
  path: ["confirmPassword"],
});

const loginWithPasswordSchema = z.object({
  identifier: z.string().min(10),
  password: z.string().min(8),
});

const resetPasswordWithOtpSchema = z.object({
  identifier: z.string().min(10),
  otp: z.string().min(6).max(6),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Password and confirm password must match",
  path: ["confirmPassword"],
});

const roleSchema = z.object({
  role: z.enum(["CITIZEN", "ADMIN"]),
  adminCode: z.string().optional(),
});

function serializeUserWithAccess(user) {
  return {
    ...serializeUser(user),
    canRequestAdminRole: true,
  };
}

async function applyOwnerRoleIfEligible(user, mobile) {
  if (isOwnerMobile(mobile) && user.role !== "OWNER") {
    if (isDemoMode()) {
      return updateDemoUser(mobile, { role: "OWNER" });
    } else {
      return prisma.user.update({
        where: { id: user.id },
        data: { role: "OWNER" },
      });
    }
  }

  return user;
}

async function issueSession(res, user, summary) {
  const token = generateToken(user);
  setAuthCookie(res, token);

  try {
    await logAuditEvent({
      actor: user,
      action: AuditAction.AUTHENTICATED,
      entityType: "USER",
      entityId: user.id,
      summary,
    });
  } catch (error) {
    console.error("Audit log failed during authentication", error);
  }

  return res.json({
    message: "Authenticated",
    user: serializeUserWithAccess(user),
  });
}

export async function registerWithPassword(req, res) {
  const parsedPayload = registerWithPasswordSchema.safeParse(req.body);

  if (!parsedPayload.success) {
    return res.status(400).json({ message: "Invalid registration payload" });
  }

  const payload = parsedPayload.data;
  const normalizedIdentifier = normalizeMobileNumber(payload.identifier);

  if (!/^\+[1-9]\d{9,14}$/.test(normalizedIdentifier)) {
    return res.status(400).json({ message: "Enter a valid phone number in +91XXXXXXXXXX format." });
  }

  let user;
  
  if (isDemoMode()) {
    user = getDemoUser(normalizedIdentifier);
    if (user?.passwordHash) {
      return res.status(409).json({ message: "Account already exists. Please login with your password." });
    }
    
    const nextPasswordHash = hashPassword(payload.password);
    if (user) {
      user = updateDemoUser(normalizedIdentifier, {
        passwordHash: nextPasswordHash,
        authMethod: AuthMethod.PASSWORD,
      });
    } else {
      user = setDemoUser(normalizedIdentifier, {
        authMethod: AuthMethod.PASSWORD,
        mobile: normalizedIdentifier,
        passwordHash: nextPasswordHash,
        role: "CITIZEN",
      });
    }
  } else {
    try {
      user = await prisma.user.findFirst({ where: { mobile: normalizedIdentifier } });

      if (user?.passwordHash) {
        return res.status(409).json({ message: "Account already exists. Please login with your password." });
      }

      const nextPasswordHash = hashPassword(payload.password);

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash: nextPasswordHash,
            authMethod: AuthMethod.PASSWORD,
          },
        });
      } else {
        console.log("Creating new user with mobile:", normalizedIdentifier);
        user = await prisma.user.create({
          data: {
            authMethod: AuthMethod.PASSWORD,
            mobile: normalizedIdentifier,
            passwordHash: nextPasswordHash,
          },
        });
        console.log("User created:", user.id);
      }
    } catch (dbError) {
      console.error("Database error during registration:", dbError.message, dbError.code);
      throw dbError;
    }
  }

  user = await applyOwnerRoleIfEligible(user, normalizedIdentifier);

  return issueSession(res, user, `${user.mobile || "Unknown user"} authenticated with password`);
}

export async function loginWithPassword(req, res) {
  const parsedPayload = loginWithPasswordSchema.safeParse(req.body);

  if (!parsedPayload.success) {
    return res.status(400).json({ message: "Invalid login payload" });
  }

  const payload = parsedPayload.data;
  const normalizedIdentifier = normalizeMobileNumber(payload.identifier);
  
  let user;
  if (isDemoMode()) {
    user = getDemoUser(normalizedIdentifier);
  } else {
    user = await prisma.user.findFirst({ where: { mobile: normalizedIdentifier } });
  }

  if (!user) {
    return res.status(401).json({ message: "No account found for this mobile number. Please create an account." });
  }

  if (!user.passwordHash) {
    return res.status(400).json({ message: "This account does not have a password yet. Please create one first." });
  }

  if (!verifyPassword(payload.password, user.passwordHash)) {
    return res.status(401).json({ message: "Invalid mobile number or password" });
  }

  if (user.authMethod !== AuthMethod.PASSWORD) {
    if (isDemoMode()) {
      user = updateDemoUser(normalizedIdentifier, { authMethod: AuthMethod.PASSWORD });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { authMethod: AuthMethod.PASSWORD },
      });
    }
  }

  user = await applyOwnerRoleIfEligible(user, normalizedIdentifier);

  return issueSession(res, user, `${user.mobile || "Unknown user"} authenticated with password`);
}

export async function sendPasswordResetOtp(req, res) {
  const parsedPayload = sendPasswordResetOtpSchema.safeParse(req.body);

  if (!parsedPayload.success) {
    return res.status(400).json({ message: "Invalid identifier" });
  }

  const payload = parsedPayload.data;
  const normalizedIdentifier = normalizeMobileNumber(payload.identifier);

  // Check if user exists
  const user = await prisma.user.findFirst({ where: { mobile: normalizedIdentifier } });

  if (!user) {
    return res.status(404).json({ message: "No account found for this mobile number" });
  }

  try {
    const { code } = await generateAndSendOtp(normalizedIdentifier);
    // Return code for development/testing; remove in production
    return res.json({
      message: "OTP sent to registered mobile number",
      // code, // Uncomment only for testing
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to send OTP" });
  }
}

export async function resetPasswordWithOtp(req, res) {
  const parsedPayload = resetPasswordWithOtpSchema.safeParse(req.body);

  if (!parsedPayload.success) {
    return res.status(400).json({ message: "Invalid password reset payload" });
  }

  const payload = parsedPayload.data;
  const normalizedIdentifier = normalizeMobileNumber(payload.identifier);

  // Verify OTP
  const isValidOtp = verifyOtp(normalizedIdentifier, payload.otp);
  if (!isValidOtp) {
    return res.status(401).json({ message: "Invalid or expired OTP. Request a new one." });
  }

  let user = await prisma.user.findFirst({ where: { mobile: normalizedIdentifier } });

  if (!user) {
    return res.status(404).json({ message: "No account found for this mobile number" });
  }

  user = await prisma.user.update({
    where: { id: user.id },
    data: {
      authMethod: AuthMethod.PASSWORD,
      passwordHash: hashPassword(payload.password),
    },
  });

  user = await applyOwnerRoleIfEligible(user, normalizedIdentifier);

  return issueSession(res, user, `${user.mobile || "Unknown user"} reset password with OTP`);
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

  let adminLocation = null;

  // Prevent self-promotion to admin without secret invite code
  if (payload.role === "ADMIN") {
    if (user.adminAccessDisabledAt) {
      return res.status(403).json({ message: "Admin access has been disabled for this account" });
    }

    if (!payload.adminCode) {
      return res.status(403).json({ message: "Admin code is required" });
    }

    const parsedSecretCode = parseAdminSecretCode(payload.adminCode);

    if (!parsedSecretCode) {
      return res.status(403).json({ message: "Invalid admin code. Use civic_service_state_district_city format." });
    }

    // Normalize admin location values to lowercase for consistency with citizen locations
    adminLocation = {
      country: parsedSecretCode.location.country.toLowerCase(),
      state: parsedSecretCode.location.state.toLowerCase(),
      district: parsedSecretCode.location.district.toLowerCase(),
      cityVillage: parsedSecretCode.location.cityVillage.toLowerCase(),
    };
  }

  const updated = isDemoMode()
    ? updateDemoUser(user.mobile, {
      role: payload.role,
      ...(adminLocation || {}),
    })
    : await prisma.user.update({
      where: { id: user.id },
      data: {
        role: payload.role,
        ...(adminLocation || {}),
      },
    });

  if (!updated) {
    return res.status(404).json({ message: "Unable to update role for current user" });
  }

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
