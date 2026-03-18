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

function toTitleCase(value = "") {
  return value
    .split(" ")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ")
    .trim();
}

export function parseAdminSecretCode(adminCode = "") {
  const normalizedCode = String(adminCode).trim();
  const prefix = "civic_service_";

  if (!normalizedCode.toLowerCase().startsWith(prefix)) {
    return null;
  }

  const encodedLocation = normalizedCode.slice(prefix.length).trim();

  if (!encodedLocation || !/^[a-zA-Z0-9_-]{3,120}$/.test(encodedLocation)) {
    return null;
  }

  const parts = encodedLocation
    .split("_")
    .map((part) => part.replace(/-/g, " ").trim())
    .filter(Boolean);

  if (!parts.length) {
    return null;
  }

  const state = toTitleCase(parts[0]);
  const district = toTitleCase(parts[1] || parts[0]);
  const cityVillage = toTitleCase(parts.slice(2).join(" ") || parts[parts.length - 1]);

  if (!state || !district || !cityVillage) {
    return null;
  }

  return {
    locationCode: encodedLocation,
    location: {
      country: "India",
      state,
      district,
      cityVillage,
    },
  };
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
