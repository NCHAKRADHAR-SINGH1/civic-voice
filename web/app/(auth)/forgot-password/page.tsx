"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";
import { apiFetch } from "@/lib/api";
import { firebaseAuth } from "@/lib/firebase";
import { User } from "@/lib/types";

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
      return "Too many attempts. Try again later.";
    case "auth/captcha-check-failed":
      return "reCAPTCHA verification failed. Complete the captcha and try again.";
    case "auth/quota-exceeded":
      return "OTP quota has been exceeded for this project.";
    case "auth/invalid-app-credential":
      return "App verification failed. Check authorized domains and reCAPTCHA.";
    case "auth/missing-app-credential":
      return "reCAPTCHA was not completed. Complete it and try again.";
    case "auth/code-expired":
      return "The OTP expired. Request a new one.";
    case "auth/invalid-verification-code":
      return "The OTP is invalid.";
    default:
      return error instanceof Error ? error.message : "Password reset failed.";
  }
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
          setError("reCAPTCHA expired. Please send OTP again.");
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

  const sendOtp = async (event: FormEvent) => {
    event.preventDefault();
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

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault();

    if (!confirmationResult) {
      setError("OTP session expired. Please send OTP again.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Password and confirm password must match.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const credential = await confirmationResult.confirm(otp);
      const firebaseIdToken = await credential.user.getIdToken();

      const response = await apiFetch<{ user: User }>("/auth/reset-password-otp", {
        method: "POST",
        body: {
          identifier,
          firebaseIdToken,
          password: newPassword,
          confirmPassword,
        },
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
    <main className="mx-auto max-w-xl">
      <section className="card p-6 sm:p-8">
        <h2 className="mb-2 text-3xl font-semibold">Forgot password</h2>
        <p className="mb-5 text-sm text-[var(--muted)]">OTP is used only on this page to reset your password.</p>

        <form className="space-y-4" onSubmit={sent ? resetPassword : sendOtp}>
          <input
            className="input"
            placeholder="+91XXXXXXXXXX"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
            inputMode="tel"
            autoComplete="tel"
          />

          {sent && (
            <>
              <input
                className="input"
                placeholder="6-digit OTP"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                required
              />
              <input
                className="input"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <input
                className="input"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </>
          )}

          {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">{error}</p>}

          <div className="space-y-2">
            {!isFirebaseTestMode && <div ref={recaptchaContainerRef} />}
            <p className="text-xs text-[var(--muted)]">
              {isFirebaseTestMode
                ? "Firebase test mode is active, so reCAPTCHA is hidden."
                : "Complete reCAPTCHA and use the OTP sent to your phone."}
            </p>
          </div>

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Please wait..." : sent ? "Reset Password" : "Send OTP"}
          </button>
        </form>

        <p className="mt-5 text-xs text-[var(--muted)]">
          <Link href="/login" className="underline">Back to login</Link>
        </p>
      </section>
    </main>
  );
}
