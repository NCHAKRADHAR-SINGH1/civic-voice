import "dotenv/config";

const requiredAlways = [
  "DATABASE_URL",
  "DIRECT_DATABASE_URL",
  "JWT_SECRET",
  "CORS_ORIGIN",
];

const requiredWhenTurnstileEnabled = ["TURNSTILE_SECRET_KEY"];

const missing = [];

for (const key of requiredAlways) {
  if (!process.env[key] || String(process.env[key]).trim() === "") {
    missing.push(key);
  }
}

const turnstileEnabled = String(process.env.TURNSTILE_VERIFY_ENABLED || "true").toLowerCase() === "true";
if (turnstileEnabled) {
  for (const key of requiredWhenTurnstileEnabled) {
    if (!process.env[key] || String(process.env[key]).trim() === "") {
      missing.push(key);
    }
  }
}

if (missing.length > 0) {
  console.error("ENV VALIDATION FAILED");
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("ENV VALIDATION PASSED");
