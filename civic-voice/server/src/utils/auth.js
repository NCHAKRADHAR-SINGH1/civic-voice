import jwt from "jsonwebtoken";

export const AUTH_COOKIE_NAME = "civic_voice_session";

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;
const ALLOWED_SAME_SITE_VALUES = new Set(["lax", "strict", "none"]);

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }

  return value;
}

export function getJwtSecret() {
  return getRequiredEnv("JWT_SECRET");
}

export function generateToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}

export function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const requestedSameSite = String(process.env.AUTH_COOKIE_SAME_SITE || "lax").toLowerCase();
  const sameSite = ALLOWED_SAME_SITE_VALUES.has(requestedSameSite) ? requestedSameSite : "lax";
  const secure = process.env.AUTH_COOKIE_SECURE
    ? process.env.AUTH_COOKIE_SECURE === "true"
    : isProduction || sameSite === "none";
  const domain = process.env.AUTH_COOKIE_DOMAIN || undefined;

  return {
    httpOnly: true,
    sameSite,
    secure,
    maxAge: SEVEN_DAYS_IN_MS,
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

export function clearAuthCookie(res) {
  const { maxAge, ...cookieOptions } = getAuthCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions);
}

export function serializeUser(user) {
  return {
    id: user.id,
    role: user.role,
    mobile: user.mobile,
    canRequestAdminRole: false,
    adminAccessDisabledAt: user.adminAccessDisabledAt,
    location: {
      country: user.country,
      state: user.state,
      district: user.district,
      cityVillage: user.cityVillage,
    },
    locationUpdatedAt: user.locationUpdatedAt,
  };
}
