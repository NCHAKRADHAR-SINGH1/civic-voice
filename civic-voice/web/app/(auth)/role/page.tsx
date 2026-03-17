"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/components/session-utils";
import { containerStagger, fadeUp } from "@/components/motion-presets";

export default function RolePage() {
  const router = useRouter();
  const { user, loading, refreshSession } = useSession();
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState("");
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [adminCode, setAdminCode] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (user?.role === "OWNER") {
      router.push("/owner");
      return;
    }

    if (user?.role) {
      router.push("/location");
    }
  }, [loading, router, user]);

  const submitRole = async (role: "CITIZEN" | "ADMIN", event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (role === "ADMIN" && !showAdminCode) {
      setShowAdminCode(true);
      return;
    }

    setSelecting(true);

    try {
      await apiFetch("/auth/role", {
        method: "PUT",
        body: {
          role,
          ...(role === "ADMIN" ? { adminCode: adminCode.trim() } : {}),
        },
      });

      await refreshSession();
      router.push("/location");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update role");
    } finally {
      setSelecting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card p-6 text-center">
          <p className="text-[var(--muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl">
      <motion.section className="hero-panel space-y-6" variants={containerStagger} initial="hidden" animate="visible">
        <motion.div variants={fadeUp} className="text-center">
          <p className="eyebrow justify-center">Access Setup</p>
          <h2 className="mb-2 text-2xl font-bold">Welcome!</h2>
          <p className="text-[var(--muted)]">Tell us your role so we can customize your experience.</p>
          <p className="mt-2 text-xs text-[var(--muted)]">Phone OTP verification is already complete. Select your role below.</p>
        </motion.div>

        {!showAdminCode ? (
          <motion.div variants={fadeUp} className="space-y-3">
            <button
              onClick={(event) => submitRole("CITIZEN", event)}
              disabled={selecting}
              className="group block w-full rounded-[1.5rem] border border-black/5 bg-white/45 p-5 text-left transition-all hover:-translate-y-1 hover:border-blue-500/50 hover:bg-blue-50/70 dark:border-white/10 dark:bg-white/5 dark:hover:bg-blue-950/60"
            >
              <div className="flex items-start gap-3">
                <Users className="mt-1 h-6 w-6 shrink-0 text-blue-600" />
                <div>
                  <h3 className="font-semibold">Citizen</h3>
                  <p className="text-sm text-[var(--muted)]">Report civic issues, upvote problems in your area, and see resolutions.</p>
                </div>
              </div>
            </button>

            {user.canRequestAdminRole ? (
              <button
                onClick={(event) => submitRole("ADMIN", event)}
                disabled={selecting}
                className="group block w-full rounded-[1.5rem] border border-black/5 bg-white/45 p-5 text-left transition-all hover:-translate-y-1 hover:border-green-500/50 hover:bg-green-50/70 dark:border-white/10 dark:bg-white/5 dark:hover:bg-green-950/60"
              >
                <div className="flex items-start gap-3">
                  <Shield className="mt-1 h-6 w-6 shrink-0 text-green-600" />
                  <div>
                    <h3 className="font-semibold">Government / Administrator</h3>
                    <p className="text-sm text-[var(--muted)]">Review and resolve civic issues only within your assigned location.</p>
                  </div>
                </div>
              </button>
            ) : (
              <div className="rounded-[1.5rem] border border-black/10 bg-black/5 p-5 text-sm text-[var(--muted)] dark:border-white/10 dark:bg-white/5">
                Administrator access is enabled only for approved mobile numbers issued by the project owner.
              </div>
            )}
          </motion.div>
        ) : (
          <motion.form variants={fadeUp} onSubmit={(event) => submitRole("ADMIN", event)} className="space-y-4">
            <div className="flex items-center gap-2 rounded-2xl bg-green-50 p-4 dark:bg-green-950">
              <Shield className="h-5 w-5 shrink-0 text-green-600" />
              <p className="text-sm font-medium text-green-800 dark:text-green-200">Admin verification required</p>
            </div>

            <p className="text-xs text-[var(--muted)]">Enter the admin invite code here. Do not enter OTP in this field.</p>

            <div>
              <label className="mb-1 block text-sm font-medium">Enter your admin invite code</label>
              <input
                className="input"
                type="password"
                placeholder="Admin invite code"
                value={adminCode}
                onChange={(event) => setAdminCode(event.target.value)}
                autoFocus
                required
              />
              <p className="mt-1 text-xs text-[var(--muted)]">This code is issued only to approved administrators.</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAdminCode(false);
                  setAdminCode("");
                  setError("");
                }}
                className="btn-secondary flex-1"
                disabled={selecting}
              >
                Back
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={selecting || !adminCode.trim()}>
                {selecting ? "Verifying..." : "Confirm"}
              </button>
            </div>
          </motion.form>
        )}

        {error && <motion.p variants={fadeUp} className="text-sm text-red-500">{error}</motion.p>}
      </motion.section>
    </main>
  );
}
