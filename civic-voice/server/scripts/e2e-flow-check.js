import "dotenv/config";
import { AuthMethod } from "@prisma/client";
import prisma from "../src/utils/prisma.js";
import { generateToken } from "../src/utils/auth.js";

const API_BASE = "http://localhost:5000/api";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function api(path, token, method = "GET", body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function upsertUser({ mobile, role, location }) {
  const normalized = mobile;
  const existing = await prisma.user.findFirst({ where: { mobile: normalized } });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        role,
        authMethod: AuthMethod.MOBILE,
        country: location.country,
        state: location.state,
        district: location.district,
        cityVillage: location.cityVillage,
        adminAccessDisabledAt: null,
      },
    });
  }

  return prisma.user.create({
    data: {
      mobile: normalized,
      role,
      authMethod: AuthMethod.MOBILE,
      country: location.country,
      state: location.state,
      district: location.district,
      cityVillage: location.cityVillage,
    },
  });
}

async function run() {
  const health = await fetch(`${API_BASE}/health`);
  assert(health.ok, "Backend API is not running on localhost:5000");

  const baseLocation = {
    country: "India",
    state: "Maharashtra",
    district: "Mumbai",
    cityVillage: "Mumbai",
  };

  const citizenA = await upsertUser({
    mobile: "+916111111111",
    role: "CITIZEN",
    location: baseLocation,
  });

  // Purposely keep location values in different casing to validate new insensitive matching.
  const citizenB = await upsertUser({
    mobile: "+916222222222",
    role: "CITIZEN",
    location: {
      country: "india",
      state: "maharashtra",
      district: "mumbai",
      cityVillage: "mumbai",
    },
  });

  const admin = await upsertUser({
    mobile: "+919999999999",
    role: "ADMIN",
    location: baseLocation,
  });

  const owner = await upsertUser({
    mobile: "+918888888888",
    role: "OWNER",
    location: baseLocation,
  });

  const citizenAToken = generateToken(citizenA);
  const citizenBToken = generateToken(citizenB);
  const adminToken = generateToken(admin);
  const ownerToken = generateToken(owner);

  const createdIssue = await api("/issues", citizenAToken, "POST", {
    title: `E2E issue ${Date.now()}`,
    description: "Testing end-to-end flow from citizen to admin resolve and owner visibility.",
    category: "water",
    departmentTag: "water-board",
  });

  const citizenBFeed = await api("/issues?sort=recent", citizenBToken, "GET");
  const issueInCitizenBFeed = citizenBFeed.find((item) => item.id === createdIssue.id);
  assert(issueInCitizenBFeed, "Citizen B could not see Citizen A issue in same location feed");

  const resolved = await api(`/admin/posts/${createdIssue.id}/resolve`, adminToken, "POST", {
    resolutionProofImages: [
      "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6",
      "https://images.unsplash.com/photo-1516302752625-fcc3c50ae61f",
    ],
  });

  assert(resolved.status === "RESOLVED", "Admin resolve endpoint did not set RESOLVED status");
  assert(Array.isArray(resolved.resolutionProofImages) && resolved.resolutionProofImages.length === 2, "Resolution proof images were not saved");

  const citizenBFeedAfterResolve = await api("/issues?sort=recent", citizenBToken, "GET");
  const resolvedFromFeed = citizenBFeedAfterResolve.find((item) => item.id === createdIssue.id);
  assert(resolvedFromFeed, "Resolved issue missing from citizen feed after admin action");
  assert(resolvedFromFeed.status === "RESOLVED", "Citizen does not see issue as RESOLVED");
  assert(Array.isArray(resolvedFromFeed.resolutionProofImages) && resolvedFromFeed.resolutionProofImages.length === 2, "Citizen does not see resolution proof images");

  const ownerAdmins = await api("/owner/admins", ownerToken, "GET");
  assert(Array.isArray(ownerAdmins) && ownerAdmins.some((entry) => entry.mobile === "+919999999999"), "Owner admins list missing expected admin mobile");

  const auditLogs = await api("/owner/audit-logs?limit=100", ownerToken, "GET");
  const hasResolvedLog = Array.isArray(auditLogs)
    && auditLogs.some((log) => log.entityId === createdIssue.id && log.action === "ISSUE_RESOLVED");
  assert(hasResolvedLog, "Owner audit logs missing ISSUE_RESOLVED entry for test issue");

  console.log("E2E CHECK PASSED");
  console.log(`Issue ID: ${createdIssue.id}`);
  console.log("Flow validated: citizen create -> same-location visibility -> admin resolve -> owner audit visibility");
}

run()
  .catch((error) => {
    console.error("E2E CHECK FAILED:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
