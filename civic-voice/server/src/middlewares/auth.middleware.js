import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.js";
import { AUTH_COOKIE_NAME, getJwtSecret } from "../utils/auth.js";

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) {
    return null;
  }

  for (const chunk of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = chunk.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}

function getRequestToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  return getCookieValue(req.headers.cookie, AUTH_COOKIE_NAME);
}

export async function requireAuth(req, res, next) {
  const token = getRequestToken(req);
  if (!token) {
    return res.status(401).json({ message: "Missing auth token" });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
      return res.status(401).json({ message: "Invalid auth token" });
    }

    req.user = user;
    return next();
  } catch (_err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required" });
  }

  if (req.user?.adminAccessDisabledAt) {
    return res.status(403).json({ message: "Admin access has been disabled" });
  }

  return next();
}

export function requireOwner(req, res, next) {
  if (req.user?.role !== "OWNER") {
    return res.status(403).json({ message: "Owner access required" });
  }

  return next();
}
