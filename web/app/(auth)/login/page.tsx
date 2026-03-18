"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { User } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";

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

type AuthMode = "login" | "register";
const FORCE_ROLE_SELECTION_KEY = "civic_voice_force_role_selection";

declare global {
  interface Window {
    grecaptcha: any;
  }
}

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaScriptLoaded, setCaptchaScriptLoaded] = useState(false);
  const captchaContainerRef = useRef<HTMLDivElement>(null);
  
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
  const shouldRenderCaptcha = mode === "register" && Boolean(recaptchaSiteKey);

  // Load reCAPTCHA script
  useEffect(() => {
    if (!shouldRenderCaptcha || captchaScriptLoaded || typeof window === "undefined") {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => setCaptchaScriptLoaded(true);
    document.head.appendChild(script);
  }, [shouldRenderCaptcha, captchaScriptLoaded]);

  // Render reCAPTCHA widget when script is loaded
  useEffect(() => {
    if (!shouldRenderCaptcha || !captchaScriptLoaded || !window.grecaptcha || !captchaContainerRef.current) {
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
  }, [shouldRenderCaptcha, captchaScriptLoaded]);

  const submitAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const normalizedIdentifier = normalizeMobileNumber(identifier);

      if (!/^\+[1-9]\d{9,14}$/.test(normalizedIdentifier)) {
        throw new Error("Enter a valid phone number in +91XXXXXXXXXX format.");
      }

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      if (mode === "register" && password !== confirmPassword) {
        throw new Error("Password and confirm password must match.");
      }

      // Validate captcha for registration (only if site key is configured)
      if (mode === "register" && recaptchaSiteKey && !captchaToken) {
        throw new Error("Please complete the reCAPTCHA verification.");
      }

      const response = await apiFetch<{ user: User }>(mode === "register" ? "/auth/register-password" : "/auth/login-password", {
        method: "POST",
        body: {
          identifier: normalizedIdentifier,
          password,
          ...(mode === "register"
            ? {
              confirmPassword,
              recaptchaToken: captchaToken,
            }
            : {}),
        },
      });

      if (response.user.role === "OWNER") {
        router.push("/owner");
        return;
      }

      // Check if user is fully registered with location and role set
      const hasLocation = response.user.location?.country && response.user.location?.state && response.user.location?.district && response.user.location?.cityVillage;
      if (hasLocation) {
        // User is fully registered, take them directly to dashboard
        router.push("/dashboard");
        return;
      }

      localStorage.setItem(FORCE_ROLE_SELECTION_KEY, "true");
      router.push("/location");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="hero-panel">
        <p className="eyebrow">Secure Sign In</p>
        <h2 className="mb-4 text-4xl leading-tight">{t("login.title")}</h2>
        <p className="mb-8 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">{t("login.subtitle")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="stat-chip">
            <p className="text-sm font-semibold">Secure password login</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Sign in with mobile number and password</p>
          </div>
          <div className="stat-chip">
            <p className="text-sm font-semibold">Role-based access</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Citizen, admin, and owner paths stay separated</p>
          </div>
          <div className="stat-chip">
            <p className="text-sm font-semibold">Geo-aware workflow</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Everything adapts to your assigned locality</p>
          </div>
        </div>
      </section>
      <section className="card p-6 sm:p-8">
        <h3 className="mb-1 text-2xl font-semibold">Continue</h3>
        <p className="mb-5 text-sm text-[var(--muted)]">Use your mobile number with password to access Civic Voice.</p>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-black/10 bg-black/5 p-2 dark:border-white/15 dark:bg-white/5">
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${mode === "login" ? "bg-white text-black shadow-sm dark:bg-white dark:text-black" : "text-[var(--muted)]"}`}
            onClick={() => {
              setMode("login");
              setConfirmPassword("");
              setError("");
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${mode === "register" ? "bg-white text-black shadow-sm dark:bg-white dark:text-black" : "text-[var(--muted)]"}`}
            onClick={() => {
              setMode("register");
              setError("");
              setCaptchaToken("");
            }}
          >
            Create account
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-black/10 bg-black/5 p-3 text-xs text-[var(--muted)] dark:border-white/15 dark:bg-white/5">
          <p><strong>Step 1:</strong> Enter mobile number and password.</p>
          <p><strong>Step 2:</strong> New users create password and confirm password.</p>
          <p><strong>Step 3:</strong> Set your location first, then choose role; admin still needs invite code on the Role screen.</p>
        </div>

        <form className="space-y-4" onSubmit={submitAuth}>
          <input
            className="input"
            placeholder="+91XXXXXXXXXX"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            inputMode="tel"
            autoComplete="tel"
          />

          <input
            className="input"
            type="password"
            placeholder={mode === "register" ? "Create password" : "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
          />

          {mode === "register" && (
            <>
              <input
                className="input"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <div ref={captchaContainerRef} className="g-recaptcha" style={{ display: 'flex', justifyContent: 'center' }}></div>
            </>
          )}

          {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">{error}</p>}

          <p className="text-xs text-[var(--muted)]">Forgot password flow can use OTP separately; login/signup here does not use OTP.</p>

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? t("login.pleaseWait") : mode === "register" ? "Create Account" : "Login"}
          </button>

          <p className="text-center text-xs text-[var(--muted)]">
            <Link href="/forgot-password" className="underline">Forgot password? Reset with OTP</Link>
          </p>
        </form>

        <p className="mt-5 text-xs text-[var(--muted)]">
          <Link href="/" className="underline">{t("login.backHome")}</Link>
        </p>
      </section>
    </main>
  );
}
