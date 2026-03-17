"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

export function ThemeToggle() {
  const { t } = useI18n();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("civic_voice_theme");
    const isDark = saved === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("civic_voice_theme", next ? "dark" : "light");
  };

  return (
    <button
      aria-label={t("theme.toggleAria")}
      onClick={toggle}
      className="btn-secondary flex items-center gap-2"
      type="button"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
      {dark ? t("theme.light") : t("theme.dark")}
    </button>
  );
}
