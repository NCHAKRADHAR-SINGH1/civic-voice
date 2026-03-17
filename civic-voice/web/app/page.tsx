"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useI18n } from "@/components/i18n-provider";
import { containerStagger, fadeUp, floatIn } from "@/components/motion-presets";

export default function HomePage() {
  const { t } = useI18n();

  return (
    <motion.main
      className="grid gap-6 lg:grid-cols-[1.8fr_1fr]"
      variants={containerStagger}
      initial={false}
      animate="show"
    >
      <motion.section className="hero-panel flex min-h-[30rem] flex-col justify-between" variants={fadeUp}>
        <div>
          <p className="eyebrow">{t("home.platform")}</p>
          <h2 className="mb-5 max-w-3xl text-4xl leading-tight sm:text-6xl">{t("home.hero")}</h2>
          <p className="mb-10 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            {t("home.description")}
          </p>
        </div>
        <div className="space-y-8">
          <motion.div className="flex flex-wrap gap-3" variants={floatIn}>
            <Link href="/login" className="btn-primary">{t("home.getStarted")}</Link>
            <Link href="/dashboard" className="btn-secondary">{t("home.exploreFeed")}</Link>
          </motion.div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-chip">
              <p className="text-2xl font-semibold">24h</p>
              <p className="text-sm text-[var(--muted)]">Faster escalation visibility</p>
            </div>
            <div className="stat-chip">
              <p className="text-2xl font-semibold">Ward-level</p>
              <p className="text-sm text-[var(--muted)]">Precise local issue discovery</p>
            </div>
            <div className="stat-chip">
              <p className="text-2xl font-semibold">Proof-first</p>
              <p className="text-sm text-[var(--muted)]">Resolution updates with evidence</p>
            </div>
          </div>
        </div>
      </motion.section>
      <motion.aside className="grid gap-6" variants={fadeUp}>
        <section className="card p-6">
          <p className="mb-2 text-xs uppercase tracking-[0.24em] text-[var(--muted)]">How Sign-In Works</p>
          <div className="space-y-4 text-sm text-[var(--muted)]">
            <div>
              <p className="font-semibold text-[var(--text)]">1. Verify phone number</p>
              <p>Enter your mobile number and complete OTP verification first.</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--text)]">2. Select your role</p>
              <p>After OTP, continue as Citizen or use approved Administrator access.</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--text)]">3. Use admin code only if needed</p>
              <p>Admin invite codes are entered on the role screen, not in the OTP field.</p>
            </div>
          </div>
        </section>
        <section className="card p-6">
          <h3 className="mb-3 text-2xl font-semibold">{t("home.builtForScale")}</h3>
          <motion.ul className="space-y-3 text-sm leading-6 text-[var(--muted)]" variants={containerStagger}>
            <motion.li variants={floatIn}>{t("home.featureOtp")}</motion.li>
            <motion.li variants={floatIn}>{t("home.featureLocation")}</motion.li>
            <motion.li variants={floatIn}>{t("home.featureUpvote")}</motion.li>
            <motion.li variants={floatIn}>{t("home.featureReport")}</motion.li>
            <motion.li variants={floatIn}>{t("home.featureAdmin")}</motion.li>
          </motion.ul>
        </section>
        <section className="card p-6">
          <p className="mb-2 text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Live Operating Model</p>
          <div className="space-y-4 text-sm text-[var(--muted)]">
            <div>
              <p className="font-semibold text-[var(--text)]">Citizens</p>
              <p>Spot patterns in the same street or village before raising duplicate complaints.</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--text)]">Administrators</p>
              <p>Moderate only their assigned geography and close issues with photo proof.</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--text)]">Developers</p>
              <p>Review end-to-end audit activity through the owner console.</p>
            </div>
          </div>
        </section>
      </motion.aside>
    </motion.main>
  );
}
