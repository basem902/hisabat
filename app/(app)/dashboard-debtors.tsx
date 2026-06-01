"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Phone,
  MessageCircle,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  cn,
  formatCurrency,
  monthName,
  whatsAppLink,
  buildReminderMessage,
} from "@/lib/utils";

export interface DashboardDebtor {
  id: number;
  name: string;
  apartmentNumber: string | null;
  phone: string | null;
  owed: number;
  monthlyOwed: number;
  emergencyOwed: number;
  missingMonths: { year: number; month: number; remaining: number }[];
  emergencyUnpaid: { title: string; owed: number }[];
}

export function DashboardDebtors({
  debtors,
  currency,
  buildingName,
}: {
  debtors: DashboardDebtor[];
  currency: string;
  buildingName: string;
}) {
  const [open, setOpen] = React.useState<Set<number>>(new Set());
  const toggle = (id: number) =>
    setOpen((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const total = debtors.reduce((s, d) => s + d.owed, 0);

  if (debtors.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 dark:text-emerald-400 mb-3" />
          <p className="font-semibold mb-1">لا يوجد متأخّرون 🎉</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            جميع الجيران سدّدوا مستحقاتهم ورسوم الطوارئ.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 dark:border-amber-500/40 bg-amber-50/40 dark:bg-amber-500/5">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            المتأخّرون ({debtors.length})
          </h2>
          <span className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-300">
            إجمالي {formatCurrency(total, currency)}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          {debtors.map((d) => {
            const months = d.missingMonths
              .map((m) => `${monthName(m.month)} ${m.year}`)
              .join("، ");
            const parts: string[] = [];
            if (d.monthlyOwed > 0)
              parts.push(`اشتراك ${formatCurrency(d.monthlyOwed, currency)}${months ? ` (${months})` : ""}`);
            for (const e of d.emergencyUnpaid)
              parts.push(`${e.title} ${formatCurrency(e.owed, currency)}`);
            const wa = d.phone
              ? whatsAppLink(
                  d.phone,
                  buildReminderMessage({
                    name: d.name,
                    amount: formatCurrency(d.owed, currency),
                    months: parts.join(" + "),
                    buildingName,
                  })
                )
              : "";
            return (
              <div
                key={d.id}
                className="border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                <button
                  onClick={() => toggle(d.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-right cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{d.name}</p>
                      {d.apartmentNumber && (
                        <Badge>شقة {d.apartmentNumber}</Badge>
                      )}
                      {d.emergencyOwed > 0 && (
                        <Badge variant="info">
                          <Zap className="w-3 h-3" /> طوارئ
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-base font-bold tabular-nums text-amber-600 dark:text-amber-400 shrink-0">
                    {formatCurrency(d.owed, currency)}
                  </span>
                  <ChevronLeft
                    className={cn(
                      "w-5 h-5 text-slate-400 shrink-0 transition-transform",
                      open.has(d.id) && "-rotate-90"
                    )}
                  />
                </button>
                {open.has(d.id) && (
                  <div className="px-4 pb-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                    {d.missingMonths.map((m) => (
                      <div
                        key={`${m.year}-${m.month}`}
                        className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                      >
                        <span className="text-slate-700 dark:text-slate-300">
                          اشتراك {monthName(m.month)} {m.year}
                        </span>
                        <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                          {formatCurrency(m.remaining, currency)}
                        </span>
                      </div>
                    ))}
                    {d.emergencyUnpaid.map((e, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-500/30"
                      >
                        <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                          <Zap className="w-3.5 h-3.5" /> {e.title}
                        </span>
                        <span className="font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                          {formatCurrency(e.owed, currency)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 pt-1">
                      {d.phone && (
                        <a
                          href={`tel:${d.phone}`}
                          className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 hover:underline"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {d.phone}
                        </a>
                      )}
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          تذكير واتساب
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
