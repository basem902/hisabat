import type {
  Neighbor,
  MonthlyDue,
  Payment,
  Expense,
  Settings,
} from "@/lib/db";
import {
  buildLedgers,
  summarizeLedgers,
  computeFund,
  round2,
} from "@/lib/balance";

/**
 * Period (multi-month) report aggregation — the single source of truth shared
 * by the on-screen summary (/api/reports/range) and the PDF
 * (/api/reports/range/pdf). Scope is the activity *within* the chosen window:
 * dues and payments tagged to the selected months. Fund balance is shown as
 * opening/closing to give cumulative context.
 */

const mk = (y: number, m: number) => y * 12 + (m - 1);
const endOfMonth = (y: number, m: number) => new Date(y, m, 0);

export interface RangeMonth {
  year: number;
  month: number;
  expected: number;
  collected: number;
  expenses: number;
  net: number;
  collectionRate: number;
}

export type RangeStatus = "متأخّر" | "فائض" | "مكتمل" | "لم يدفع";

export interface RangeNeighbor {
  id: number;
  name: string;
  apartmentNumber: string | null;
  active: boolean;
  obligation: number;
  paid: number;
  owed: number;
  surplus: number;
  status: RangeStatus;
  /** monthKey -> amount paid that month (for the payment matrix). */
  byMonth: Record<number, number>;
}

export interface RangeReportData {
  buildingName: string;
  currency: string;
  from: { year: number; month: number };
  to: { year: number; month: number };
  monthsList: { year: number; month: number }[];
  perMonth: RangeMonth[];
  neighbors: RangeNeighbor[];
  totals: {
    expected: number;
    collected: number;
    expenses: number;
    net: number;
    outstanding: number;
    surplus: number;
    collectionRate: number;
  };
  fund: { opening: number; closing: number; change: number };
  expensesByCategory: { category: string; count: number; total: number }[];
  generatedAt: string;
}

export function buildRangeReport(
  neighbors: Neighbor[],
  dues: MonthlyDue[],
  payments: Payment[],
  expenses: Expense[],
  settings: Pick<Settings, "buildingName" | "currency"> | undefined,
  fromInput: { year: number; month: number },
  toInput: { year: number; month: number },
  generatedAt: string
): RangeReportData {
  // Normalize order (swap if from is after to).
  let from = fromInput;
  let to = toInput;
  if (mk(from.year, from.month) > mk(to.year, to.month)) {
    [from, to] = [to, from];
  }
  const fromKey = mk(from.year, from.month);
  const toKey = mk(to.year, to.month);
  const inRange = (y: number, m: number) => {
    const k = mk(y, m);
    return k >= fromKey && k <= toKey;
  };

  const monthsList: { year: number; month: number }[] = [];
  for (let k = fromKey; k <= toKey; k++) {
    monthsList.push({ year: Math.floor(k / 12), month: (k % 12) + 1 });
  }

  const duesInRange = dues.filter((d) => inRange(d.year, d.month));
  const paymentsInRange = payments.filter((p) => inRange(p.year, p.month));

  // Per-neighbor ledgers scoped to the window (carry-over within the range).
  const ledgers = buildLedgers(neighbors, duesInRange, paymentsInRange);
  const summary = summarizeLedgers(ledgers);

  // Index payments by neighbor+month (matrix) and by month (per-month totals).
  const paidByNeighborMonth = new Map<number, Map<number, number>>();
  const collectedByMonth = new Map<number, number>();
  for (const p of paymentsInRange) {
    const k = mk(p.year, p.month);
    collectedByMonth.set(k, round2((collectedByMonth.get(k) ?? 0) + p.amount));
    let nm = paidByNeighborMonth.get(p.neighborId);
    if (!nm) {
      nm = new Map();
      paidByNeighborMonth.set(p.neighborId, nm);
    }
    nm.set(k, round2((nm.get(k) ?? 0) + p.amount));
  }

  // Expenses by month + by category.
  const expensesByMonth = new Map<number, number>();
  const catMap = new Map<string, { count: number; total: number }>();
  for (const e of expenses) {
    if (!inRange(e.year, e.month)) continue;
    const k = mk(e.year, e.month);
    expensesByMonth.set(k, round2((expensesByMonth.get(k) ?? 0) + e.amount));
    const c = catMap.get(e.category) ?? { count: 0, total: 0 };
    c.count += 1;
    c.total = round2(c.total + e.amount);
    catMap.set(e.category, c);
  }

  const dueByMonth = new Map<number, number>();
  for (const d of duesInRange) dueByMonth.set(mk(d.year, d.month), d.amount);
  const hasPayment = (nid: number, k: number) =>
    (paidByNeighborMonth.get(nid)?.get(k) ?? 0) > 0;

  // Per-month expected uses the same eligibility as buildLedgers, so it
  // reconciles with the per-neighbor obligations.
  const perMonth: RangeMonth[] = monthsList.map(({ year, month }) => {
    const k = mk(year, month);
    const dueAmt = dueByMonth.get(k) ?? 0;
    let expected = 0;
    if (dueAmt > 0) {
      for (const n of neighbors) {
        if (new Date(n.createdAt) > endOfMonth(year, month)) continue;
        if (!n.active && !hasPayment(n.id, k)) continue;
        expected += dueAmt;
      }
    }
    const collected = collectedByMonth.get(k) ?? 0;
    const exp = expensesByMonth.get(k) ?? 0;
    return {
      year,
      month,
      expected: round2(expected),
      collected,
      expenses: exp,
      net: round2(collected - exp),
      collectionRate:
        expected > 0 ? Math.round((collected / expected) * 100) : 0,
    };
  });

  const totalExpected = round2(perMonth.reduce((s, m) => s + m.expected, 0));
  const totalCollected = round2(perMonth.reduce((s, m) => s + m.collected, 0));
  const totalExpenses = round2(perMonth.reduce((s, m) => s + m.expenses, 0));

  const rangeNeighbors: RangeNeighbor[] = ledgers
    .filter((l) => l.obligation > 0 || l.totalPaid > 0 || l.active)
    .map((l) => {
      const nm = paidByNeighborMonth.get(l.id);
      const byMonth: Record<number, number> = {};
      if (nm) for (const [k, v] of nm) byMonth[k] = v;
      const status: RangeStatus =
        l.owed > 0
          ? "متأخّر"
          : l.surplus > 0
            ? "فائض"
            : l.totalPaid > 0
              ? "مكتمل"
              : "لم يدفع";
      return {
        id: l.id,
        name: l.name,
        apartmentNumber: l.apartmentNumber,
        active: l.active,
        obligation: l.obligation,
        paid: l.totalPaid,
        owed: l.owed,
        surplus: l.surplus,
        status,
        byMonth,
      };
    })
    .sort((a, b) => b.owed - a.owed || b.paid - a.paid);

  // Fund: opening = everything before the window, closing = everything up to
  // and including the window end.
  const opening = computeFund(
    payments.filter((p) => mk(p.year, p.month) < fromKey),
    expenses.filter((e) => mk(e.year, e.month) < fromKey)
  ).balance;
  const closing = computeFund(
    payments.filter((p) => mk(p.year, p.month) <= toKey),
    expenses.filter((e) => mk(e.year, e.month) <= toKey)
  ).balance;

  const expensesByCategory = [...catMap.entries()]
    .map(([category, v]) => ({ category, count: v.count, total: v.total }))
    .sort((a, b) => b.total - a.total);

  return {
    buildingName: settings?.buildingName ?? "حسابات المبنى",
    currency: settings?.currency ?? "ر.س",
    from,
    to,
    monthsList,
    perMonth,
    neighbors: rangeNeighbors,
    totals: {
      expected: totalExpected,
      collected: totalCollected,
      expenses: totalExpenses,
      net: round2(totalCollected - totalExpenses),
      outstanding: summary.totalOutstanding,
      surplus: summary.totalSurplus,
      collectionRate:
        totalExpected > 0
          ? Math.round((totalCollected / totalExpected) * 100)
          : 0,
    },
    fund: {
      opening,
      closing,
      change: round2(closing - opening),
    },
    expensesByCategory,
    generatedAt,
  };
}
