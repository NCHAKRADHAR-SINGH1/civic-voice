"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { firebaseAuth } from "@/lib/firebase";
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";
import { User } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";

const isFirebaseTestMode = process.env.NEXT_PUBLIC_FIREBASE_USE_TEST_MODE === "true";

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

function getFirebaseErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  switch (code) {
    case "auth/invalid-phone-number":
      return "Enter a valid phone number in +91XXXXXXXXXX format.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later or use a Firebase test phone number.";
    case "auth/captcha-check-failed":
      return "reCAPTCHA verification failed. Complete the captcha and try again.";
    case "auth/quota-exceeded":
      return "Firebase phone auth quota has been exceeded for this project.";
    case "auth/invalid-app-credential":
      return "Firebase app verification failed. Check authorized domains and reCAPTCHA.";
    case "auth/missing-app-credential":
      return "reCAPTCHA was not completed. Complete it and try again.";
    case "auth/code-expired":
      return "The OTP expired. Request a new one.";
    case "auth/invalid-verification-code":
      return "The OTP is invalid.";
    default:
      return error instanceof Error ? error.message : "Authentication failed.";
  }
}

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function clearRecaptchaVerifier() {
    if (recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current.clear();
      recaptchaVerifierRef.current = null;
    }

    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = "";
    }
  }

  async function ensureRecaptchaVerifier(forceRecreate = false) {
    const container = recaptchaContainerRef.current;

    if (!container) {
      throw new Error("reCAPTCHA container is not ready yet. Refresh and try again.");
    }

    if (forceRecreate) {
      clearRecaptchaVerifier();
    }

    if (!recaptchaVerifierRef.current) {
      container.innerHTML = "";
      recaptchaVerifierRef.current = new RecaptchaVerifier(firebaseAuth, container, {
        size: "normal",
        "expired-callback": () => {
          clearRecaptchaVerifier();
          setError("reCAPTCHA expired. Please try sending OTP again.");
        },
      });
      await recaptchaVerifierRef.current.render();
    }

    return recaptchaVerifierRef.current;
  }

  useEffect(() => {
    firebaseAuth.useDeviceLanguage();
    firebaseAuth.settings.appVerificationDisabledForTesting = isFirebaseTestMode;

    void ensureRecaptchaVerifier().catch((err) => {
      setError(getFirebaseErrorMessage(err));
    });

    return () => {
      firebaseAuth.settings.appVerificationDisabledForTesting = false;

      clearRecaptchaVerifier();
    };
  }, []);

  const sendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const normalizedIdentifier = normalizeMobileNumber(identifier);

      if (!/^\+[1-9]\d{9,14}$/.test(normalizedIdentifier)) {
        throw new Error("Enter a valid phone number in +91XXXXXXXXXX format.");
      }

      let verifier = await ensureRecaptchaVerifier();

      try {
        const confirmation = await signInWithPhoneNumber(firebaseAuth, normalizedIdentifier, verifier);
        setConfirmationResult(confirmation);
        setIdentifier(normalizedIdentifier);
        setSent(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        if (
          message.includes("reCAPTCHA client element has been removed")
          || message.includes("reCAPTCHA Timeout")
          || message.toLowerCase().includes("timeout")
        ) {
          verifier = await ensureRecaptchaVerifier(true);
          const confirmation = await signInWithPhoneNumber(firebaseAuth, normalizedIdentifier, verifier);
          setConfirmationResult(confirmation);
          setIdentifier(normalizedIdentifier);
          setSent(true);
        } else {
          throw err;
        }
      }
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) {
      setError("OTP session expired. Please request OTP again.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const credential = await confirmationResult.confirm(otp);
      const firebaseIdToken = await credential.user.getIdToken();

      const response = await apiFetch<{ user: User }>("/auth/verify-otp", {
        method: "POST",
        body: { identifier, firebaseIdToken },
      });

      await signOut(firebaseAuth);

      if (response.user.role === "OWNER") {
        router.push("/owner");
      } else if (!response.user.role) {
        router.push("/role");
      } else if (!response.user.location?.country) {
        router.push("/location");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
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
            <p className="text-sm font-semibold">Phone verified</p>
            <p className="mt-1 text-xs text-[var(--muted)]">OTP login tied to your real number</p>
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
        <p className="mb-5 text-sm text-[var(--muted)]">Enter your number and complete verification to access Civic Voice.</p>

        <div className="mb-4 rounded-2xl border border-black/10 bg-black/5 p-3 text-xs text-[var(--muted)] dark:border-white/15 dark:bg-white/5">
          <p><strong>Step 1:</strong> Verify phone with OTP on this screen.</p>
          <p><strong>Step 2:</strong> Choose role on next screen.</p>
          <p><strong>Step 3:</strong> If choosing Admin, enter admin invite code on the Role screen only.</p>
        </div>

        <form className="space-y-4" onSubmit={sent ? verifyOtp : sendOtp}>
          <input
            className="input"
            placeholder="+91XXXXXXXXXX"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            inputMode="tel"
            autoComplete="tel"
          />

          {sent && (
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">OTP Verification</label>
              <input
                className="input"
                placeholder="6-digit OTP from SMS"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              <p className="text-xs text-[var(--muted)]">Use the OTP sent by Firebase SMS. Do not enter admin invite code here.</p>
            </div>
          )}

          {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">{error}</p>}

          {isFirebaseTestMode && (
            <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-700 dark:text-sky-200">
              Firebase test mode is enabled. Use a fictional phone number configured in Firebase Console and enter its matching test OTP code. No real SMS will be sent.
            </p>
          )}

          <div className="space-y-2">
            {!isFirebaseTestMode && <div ref={recaptchaContainerRef} />}
            <p className="text-xs text-[var(--muted)]">
              {isFirebaseTestMode
                ? "Firebase test mode is active, so reCAPTCHA is hidden. Set NEXT_PUBLIC_FIREBASE_USE_TEST_MODE=false to show captcha."
                : "Use a real number in +91XXXXXXXXXX format. For localhost development, Firebase may require a test phone number or a real hosted domain."}
            </p>
          </div>

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? t("login.pleaseWait") : sent ? t("login.verifyOtp") : t("login.sendOtp")}
          </button>
        </form>

        <p className="mt-5 text-xs text-[var(--muted)]">
          <Link href="/" className="underline">{t("login.backHome")}</Link>
        </p>
      </section>
    </main>
  );
}
