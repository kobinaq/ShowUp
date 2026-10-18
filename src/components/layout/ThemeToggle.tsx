"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { readThemePreference, writeThemePreference } from "@/lib/branding/storage-keys";

export function ThemeToggle() {
  const [hasManualChoice, setHasManualChoice] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(readThemePreference());
  });
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = readThemePreference();
    return stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (!hasManualChoice) setIsDark(media.matches);
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [hasManualChoice]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    if (hasManualChoice) writeThemePreference(isDark ? "dark" : "light");
  }, [hasManualChoice, isDark]);

  function toggleTheme() {
    setHasManualChoice(true);
    setIsDark((value) => !value);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white/80 text-muted shadow-sm transition hover:bg-accent hover:text-navy"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </button>
  );
}
