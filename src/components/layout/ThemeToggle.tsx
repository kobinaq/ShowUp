"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

type ThemePreference = "system" | "light" | "dark";

const modes: Array<{ value: ThemePreference; label: string; Icon: typeof Monitor }> = [
  { value: "system", label: "System theme", Icon: Monitor },
  { value: "light", label: "Light theme", Icon: Sun },
  { value: "dark", label: "Dark theme", Icon: Moon }
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "system";
    const stored = window.localStorage.getItem("showup-theme") as ThemePreference | null;
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function apply(preference: ThemePreference) {
      const dark = preference === "dark" || (preference === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.dataset.theme = preference;
    }

    apply(theme);
    window.localStorage.setItem("showup-theme", theme);

    const listener = () => {
      if (theme === "system") apply("system");
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  return (
    <div className="flex items-center rounded-lg border border-slate-200 bg-white/80 p-1 shadow-sm" aria-label="Theme preference">
      {modes.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-label={label}
          title={label}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-accent hover:text-navy",
            theme === value ? "bg-primary text-primary-foreground shadow-sm" : ""
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}
