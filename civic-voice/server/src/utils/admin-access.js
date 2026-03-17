export function normalizeMobileNumber(identifier = "") {
  const digits = String(identifier).replace(/\D/g, "");

  if (String(identifier).trim().startsWith("+")) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }

  return String(identifier).replace(/\s/g, "");
}

export function getAdminAssignments() {
  return (process.env.ADMIN_ASSIGNMENTS || "")
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [mobile, inviteCode, country, state, district, cityVillage] = entry.split("|").map((value) => value.trim());
      return {
        mobile: normalizeMobileNumber(mobile),
        inviteCode,
        location: {
          country,
          state,
          district,
          cityVillage,
        },
      };
    })
    .filter((entry) => entry.mobile && entry.inviteCode && entry.location.country && entry.location.state && entry.location.district && entry.location.cityVillage);
}

export function getAdminAssignmentByMobile(mobile) {
  if (!mobile) {
    return null;
  }

  const normalizedMobile = normalizeMobileNumber(mobile);
  return getAdminAssignments().find((entry) => entry.mobile === normalizedMobile) || null;
}

export function canUserRequestAdminRole(mobile) {
  return Boolean(getAdminAssignmentByMobile(mobile));
}

export function getAllowedOwnerMobiles() {
  return new Set(
    (process.env.OWNER_ALLOWED_MOBILES || "")
      .split(",")
      .map((value) => normalizeMobileNumber(value.trim()))
      .filter(Boolean)
  );
}

export function isOwnerMobile(mobile) {
  if (!mobile) {
    return false;
  }

  return getAllowedOwnerMobiles().has(normalizeMobileNumber(mobile));
}
