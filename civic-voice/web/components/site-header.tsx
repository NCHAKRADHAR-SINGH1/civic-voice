"use client";

import Link from "next/link";
import { Crown, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useSession } from "@/components/session-utils";

export function SiteHeader() {
  const { t } = useI18n();
  const { user } = useSession();

  return (
    <header className="relative mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-black/5 pb-6 dark:border-white/5">
      <div>
        <p className="eyebrow mb-4">{t("layout.communityNetwork")}</p>
        <h1 className="text-3xl font-bold sm:text-4xl">{t("layout.appName")}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-black/5 bg-white/40 px-3 py-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
        {user?.role === "OWNER" && (
          <Link
            href="/owner"
            className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
          >
            <Crown size={16} />
            Owner
          </Link>
        )}
        {user?.role === "ADMIN" && !user.adminAccessDisabledAt && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
          >
            <Shield size={16} />
            Admin
          </Link>
        )}
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
