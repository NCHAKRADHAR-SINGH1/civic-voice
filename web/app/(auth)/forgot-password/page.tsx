"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

function normalizeMobileNumber(identifier: string) {
  const digits = identifier.replace(/\D/g, "");

  if (identifier.trim().startsWith("+")) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }

  return identifier.replace(/\s/g, "");
}

declare global {
  interface Window {
    grecaptcha: any;
  }
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaScriptLoaded, setCaptchaScriptLoaded] = useState(false);
  const captchaContainerRef = useRef<HTMLDivElement>(null);

  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

  // Load reCAPTCHA script
  useEffect(() => {
    if (captchaScriptLoaded || typeof window === "undefined") {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => setCaptchaScriptLoaded(true);
    document.head.appendChild(script);
  }, [captchaScriptLoaded]);

  // Render reCAPTCHA widget when script is loaded
  useEffect(() => {
    if (!captchaScriptLoaded || !window.grecaptcha || !captchaContainerRef.current || !sent) {
      return;
    }

    if (captchaContainerRef.current.children.length === 0) {
      window.grecaptcha.render(captchaContainerRef.current, {
        sitekey: recaptchaSiteKey,
        callback: (token: string) => {
          setCaptchaToken(token);
        },
      });
    }
  }, [captchaScriptLoaded, sent]);

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      // Validate captcha (only if site key is configured)
      if (recaptchaSiteKey && !captchaToken) {
        throw new Error("Please complete the reCAPTCHA verification.");
      }

      const normalizedIdentifier = normalizeMobileNumber(identifier);
      const response = await apiFetch("/auth/send-password-reset-otp", {
        method: "POST",
        body: JSON.stringify({ 
          identifier: normalizedIdentifier,
          recaptchaToken: captchaToken,
        }),
      }) as Response;

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to send OTP");
      }

      setSent(true);
      setSuccessMessage("OTP sent to your registered mobile number");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const normalizedIdentifier = normalizeMobileNumber(identifier);
      const response = await apiFetch("/auth/reset-password-otp", {
        method: "POST",
        body: JSON.stringify({
          identifier: normalizedIdentifier,
          otp,
          password: newPassword,
          confirmPassword,
        }),
      }) as Response;

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to reset password");
      }

      setSuccessMessage("Password reset successfully! Redirecting to dashboard...");
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-2">Reset Password</h1>
          <p className="text-center text-gray-600 mb-6">
            Enter your mobile number to receive an OTP
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {successMessage}
            </div>
          )}

          {!sent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="+91 XXXXXXXXXX"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div ref={captchaContainerRef} className="g-recaptcha" style={{ display: 'flex', justifyContent: 'center' }}></div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={identifier}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 transition"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setOtp("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setCaptchaToken("");
                  setError("");
                }}
                disabled={loading}
                className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 disabled:bg-gray-100 transition"
              >
                Back
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Remember your password?{" "}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
