"use client";

import { useI18n } from "@/components/i18n-provider";
import { locales, localeLabels, Locale } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
      <span>{t("language.select")}</span>
      <select
        className="input h-9 w-48 py-1"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t("language.select")}
      >
        {locales.map((item) => (
          <option key={item} value={item}>
            {localeLabels[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
