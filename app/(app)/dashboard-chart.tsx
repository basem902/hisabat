"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/components/theme-provider";

export function DashboardChart({
  data,
  currency,
}: {
  data: { label: string; income: number; expense: number }[];
  currency: string;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const grid = isDark ? "#1e293b" : "#e2e8f0";
  const tick = isDark ? "#94a3b8" : "#64748b";
  const tooltipBg = isDark ? "#0f172a" : "#fff";
  const tooltipBorder = isDark ? "#334155" : "#e2e8f0";
  const tooltipText = isDark ? "#e2e8f0" : "#0f172a";

  return (
    <div className="h-64 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: tick }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: tick }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: `1px solid ${tooltipBorder}`,
              backgroundColor: tooltipBg,
              color: tooltipText,
              fontSize: 12,
              direction: "rtl",
            }}
            formatter={(v) =>
              `${typeof v === "number" ? v.toLocaleString() : v} ${currency}`
            }
            cursor={{ fill: isDark ? "#1e293b" : "#f1f5f9" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, direction: "rtl", color: tick }}
            iconType="circle"
          />
          <Bar
            dataKey="income"
            name="المحصّل"
            fill="#10b981"
            radius={[6, 6, 0, 0]}
          />
          <Bar
            dataKey="expense"
            name="المصروفات"
            fill="#ef4444"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
