"use client";

import { useI18n } from "@/components/i18n-provider";
import { locales, localeLabels, Locale } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
      <span>{t("language.select")}</span>
      <select
        className="h-9 px-3 py-1 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-slate-900 text-black dark:text-white font-medium min-w-[140px]"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t("language.select")}
      >
        {locales.map((item) => (
          <option key={item} value={item} className="bg-white dark:bg-slate-900 text-black dark:text-white">
            {localeLabels[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
