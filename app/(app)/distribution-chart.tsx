"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useTheme } from "@/components/theme-provider";

export function DistributionChart({
  data,
  currency,
}: {
  data: { name: string; value: number; color: string }[];
  currency: string;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const tick = isDark ? "#94a3b8" : "#64748b";
  const tooltipBg = isDark ? "#0f172a" : "#fff";
  const tooltipBorder = isDark ? "#334155" : "#e2e8f0";
  const tooltipText = isDark ? "#e2e8f0" : "#0f172a";
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total <= 0) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
        لا توجد بيانات كافية
      </p>
    );
  }

  return (
    <div className="h-64 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: `1px solid ${tooltipBorder}`,
              backgroundColor: tooltipBg,
              color: tooltipText,
              fontSize: 12,
              direction: "rtl",
            }}
            formatter={(v) => {
              const n = typeof v === "number" ? v : Number(v);
              const pct = total > 0 ? Math.round((n / total) * 100) : 0;
              return `${n.toLocaleString()} ${currency} • ${pct}%`;
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, direction: "rtl", color: tick }}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
