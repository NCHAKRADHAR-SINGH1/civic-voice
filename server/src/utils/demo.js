import crypto from "crypto";

const DEMO_MODE = process.env.DEMO_MODE === "true";
const demoUsers = new Map();

export function isDemoMode() {
  return DEMO_MODE;
}

export function getDemoUser(mobile) {
  if (!DEMO_MODE) return null;
  return demoUsers.get(mobile);
}

export function setDemoUser(mobile, userData) {
  if (!DEMO_MODE) return null;
  demoUsers.set(mobile, {
    id: crypto.randomUUID(),
    mobile,
    ...userData,
  });
  return demoUsers.get(mobile);
}

export function updateDemoUser(mobile, updates) {
  if (!DEMO_MODE) return null;
  const user = demoUsers.get(mobile);
  if (!user) return null;
  const updated = { ...user, ...updates };
  demoUsers.set(mobile, updated);
  return updated;
}

export function getDemoUserById(id) {
  if (!DEMO_MODE) return null;

  for (const user of demoUsers.values()) {
    if (user.id === id) {
      return user;
    }
  }

  return null;
}
