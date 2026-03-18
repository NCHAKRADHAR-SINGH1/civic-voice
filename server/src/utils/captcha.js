const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function isTurnstileVerificationEnabled() {
  return String(process.env.TURNSTILE_VERIFY_ENABLED || "true").toLowerCase() !== "false";
}

export async function verifyTurnstileToken(token, remoteIp) {
  if (!isTurnstileVerificationEnabled()) {
    return { success: true, bypassed: true };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return {
      success: false,
      message: "Captcha is not configured. Set TURNSTILE_SECRET_KEY on the server.",
    };
  }

  const payload = new URLSearchParams();
  payload.append("secret", secret);
  payload.append("response", token);

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload,
  });

  if (!response.ok) {
    return {
      success: false,
      message: "Captcha verification failed. Please try again.",
    };
  }

  const result = await response.json();

  if (!result.success) {
    const errorCodes = Array.isArray(result["error-codes"]) ? result["error-codes"] : [];
    return {
      success: false,
      message: errorCodes.length > 0
        ? `Captcha verification failed: ${errorCodes.join(", ")}`
        : "Captcha verification failed. Please complete captcha again.",
      errors: errorCodes,
    };
  }

  return { success: true };
}
