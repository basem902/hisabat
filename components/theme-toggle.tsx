"use client";

import * as React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light" as const, label: "فاتح", icon: Sun },
  { value: "dark" as const, label: "داكن", icon: Moon },
  { value: "system" as const, label: "النظام", icon: Monitor },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    // Cycle through: light → dark → system → light
    const next =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    const current = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[2];
    const Icon = current.icon;
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(next)}
        title={`المظهر: ${current.label}`}
        aria-label={`تبديل المظهر (الحالي: ${current.label})`}
      >
        <Icon className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
              active
                ? "bg-blue-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:bg-slate-700"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
