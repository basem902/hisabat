"use client";

import * as React from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { ARABIC_MONTHS } from "@/lib/utils";

export function MonthPicker({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

  function shift(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    onChange(y, m);
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => shift(-1)}
        aria-label="الشهر السابق"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
      <Select
        value={month}
        onChange={(e) => onChange(year, Number(e.target.value))}
        className="h-8 border-0 shadow-none focus-visible:ring-0 px-2 text-sm font-medium"
      >
        {ARABIC_MONTHS.map((m, i) => (
          <option key={i} value={i + 1}>
            {m}
          </option>
        ))}
      </Select>
      <Select
        value={year}
        onChange={(e) => onChange(Number(e.target.value), month)}
        className="h-8 border-0 shadow-none focus-visible:ring-0 px-2 text-sm font-medium tabular-nums w-20"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => shift(1)}
        aria-label="الشهر التالي"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
    </div>
  );
}
