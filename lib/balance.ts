import type {
  Neighbor,
  MonthlyDue,
  Payment,
  SpecialChargeAssignment,
} from "@/lib/db";

/**
 * Shared balance engine — the single source of truth for every "how much
 * remaining" figure in the app.
 *
 * There are TWO independent obligation types, kept strictly separate:
 *
 *   • Monthly dues (اشتراك شهري) — a per-month fee. Overpayment in one month
 *     carries over to cover later months (a running "wallet").
 *
 *   • Emergency / one-time charges (رسوم طارئة) — e.g. an electricity meter.
 *     Each is a fixed per-neighbor amount (frozen via assignments). Payments
 *     toward an emergency charge are real cash into the fund, but they do NOT
 *     pay off monthly dues, and monthly payments do NOT pay off emergencies.
 *
 * A payment with `specialChargeId != null` is an emergency payment; otherwise
 * it is a monthly payment.
 */

/** Round to 2 decimals — amounts are double precision, avoid 0.0001 residue. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function monthKey(year: number, month: number): number {
  return year * 12 + (month - 1);
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0);
}

export interface LedgerMonth {
  year: number;
  month: number;
  due: number;
  paid: number;
  remaining: number;
  running: number;
}

export interface EmergencyItem {
  chargeId: number;
  amount: number;
  paid: number;
  owed: number;
}

export interface NeighborLedger {
  id: number;
  name: string;
  apartmentNumber: string | null;
  phone: string | null;
  active: boolean;
  notes: string | null;
  createdAt: Date | string;

  // ── Monthly subscription ──
  monthlyObligation: number;
  monthlyPaid: number;
  monthlyOwed: number;
  monthlySurplus: number;
  monthsOwed: number;
  missingMonths: LedgerMonth[];
  months: LedgerMonth[];

  // ── Emergency / one-time charges ──
  emergencyObligation: number;
  emergencyPaid: number;
  emergencyOwed: number;
  emergencyItems: EmergencyItem[];

  // ── Combined totals (monthly + emergency) ──
  obligation: number;
  totalPaid: number;
  owed: number;
  surplus: number;
}

export function buildLedgers(
  neighbors: Neighbor[],
  dues: MonthlyDue[],
  payments: Payment[],
  assignments: SpecialChargeAssignment[] = []
): NeighborLedger[] {
  // Split payments by type up front.
  const monthlyByNeighborMonth = new Map<number, Map<number, number>>();
  const monthlyTotal = new Map<number, number>();
  const emergencyByNeighborCharge = new Map<number, Map<number, number>>();
  const emergencyTotal = new Map<number, number>();

  for (const p of payments) {
    if (p.specialChargeId == null) {
      // monthly payment
      const mk = monthKey(p.year, p.month);
      let m = monthlyByNeighborMonth.get(p.neighborId);
      if (!m) {
        m = new Map();
        monthlyByNeighborMonth.set(p.neighborId, m);
      }
      m.set(mk, round2((m.get(mk) ?? 0) + p.amount));
      monthlyTotal.set(
        p.neighborId,
        round2((monthlyTotal.get(p.neighborId) ?? 0) + p.amount)
      );
    } else {
      // emergency payment (toward a special charge)
      let m = emergencyByNeighborCharge.get(p.neighborId);
      if (!m) {
        m = new Map();
        emergencyByNeighborCharge.set(p.neighborId, m);
      }
      m.set(
        p.specialChargeId,
        round2((m.get(p.specialChargeId) ?? 0) + p.amount)
      );
      emergencyTotal.set(
        p.neighborId,
        round2((emergencyTotal.get(p.neighborId) ?? 0) + p.amount)
      );
    }
  }

  const assignByNeighbor = new Map<number, SpecialChargeAssignment[]>();
  for (const a of assignments) {
    const arr = assignByNeighbor.get(a.neighborId);
    if (arr) arr.push(a);
    else assignByNeighbor.set(a.neighborId, [a]);
  }

  const duesSorted = [...dues].sort(
    (a, b) => monthKey(a.year, a.month) - monthKey(b.year, b.month)
  );

  return neighbors.map((n) => {
    const created = new Date(n.createdAt);
    const perMonth = monthlyByNeighborMonth.get(n.id) ?? new Map<number, number>();

    // ── Monthly accounting (uses monthly payments only) ──
    const billable: { mk: number; year: number; month: number; due: number }[] =
      [];
    for (const d of duesSorted) {
      if (created > endOfMonth(d.year, d.month)) continue;
      const mk = monthKey(d.year, d.month);
      if (!n.active && !perMonth.has(mk)) continue;
      billable.push({ mk, year: d.year, month: d.month, due: round2(d.amount) });
    }

    const monthlyObligation = round2(billable.reduce((s, b) => s + b.due, 0));
    const monthlyPaid = round2(monthlyTotal.get(n.id) ?? 0);
    const monthlyNet = round2(monthlyPaid - monthlyObligation);
    const monthlyOwed = monthlyNet < 0 ? round2(-monthlyNet) : 0;
    const monthlySurplus = monthlyNet > 0 ? round2(monthlyNet) : 0;

    // breakdown: allocate the monthly pool to billable months, oldest first.
    let pool = monthlyPaid;
    const missingMonths: LedgerMonth[] = [];
    for (const b of billable) {
      const applied = Math.min(pool, b.due);
      const remaining = round2(b.due - applied);
      pool = round2(pool - applied);
      if (remaining > 0) {
        missingMonths.push({
          year: b.year,
          month: b.month,
          due: b.due,
          paid: round2(applied),
          remaining,
          running: 0,
        });
      }
    }

    // timeline (for the statement) — union of billable + months with a payment.
    const timelineKeys = new Set<number>(billable.map((b) => b.mk));
    for (const mk of perMonth.keys()) timelineKeys.add(mk);
    const dueByKey = new Map(billable.map((b) => [b.mk, b.due]));
    let running = 0;
    const months: LedgerMonth[] = [...timelineKeys]
      .sort((a, b) => a - b)
      .map((mk) => {
        const year = Math.floor(mk / 12);
        const month = (mk % 12) + 1;
        const due = round2(dueByKey.get(mk) ?? 0);
        const paid = round2(perMonth.get(mk) ?? 0);
        running = round2(running + paid - due);
        return { year, month, due, paid, remaining: 0, running };
      });

    // ── Emergency accounting (assignments + emergency payments) ──
    const myAssignments = assignByNeighbor.get(n.id) ?? [];
    const myEmergencyPaid =
      emergencyByNeighborCharge.get(n.id) ?? new Map<number, number>();
    const emergencyItems: EmergencyItem[] = myAssignments.map((a) => {
      const paid = round2(myEmergencyPaid.get(a.chargeId) ?? 0);
      return {
        chargeId: a.chargeId,
        amount: round2(a.amount),
        paid,
        owed: round2(Math.max(0, a.amount - paid)),
      };
    });
    const emergencyObligation = round2(
      myAssignments.reduce((s, a) => s + a.amount, 0)
    );
    const emergencyPaid = round2(emergencyTotal.get(n.id) ?? 0);
    const emergencyOwed = round2(
      emergencyItems.reduce((s, it) => s + it.owed, 0)
    );
    const emergencySurplus = round2(
      Math.max(0, emergencyPaid - emergencyObligation)
    );

    return {
      id: n.id,
      name: n.name,
      apartmentNumber: n.apartmentNumber,
      phone: n.phone,
      active: n.active,
      notes: n.notes,
      createdAt: n.createdAt,
      monthlyObligation,
      monthlyPaid,
      monthlyOwed,
      monthlySurplus,
      monthsOwed: missingMonths.length,
      missingMonths,
      months,
      emergencyObligation,
      emergencyPaid,
      emergencyOwed,
      emergencyItems,
      obligation: round2(monthlyObligation + emergencyObligation),
      totalPaid: round2(monthlyPaid + emergencyPaid),
      owed: round2(monthlyOwed + emergencyOwed),
      surplus: round2(monthlySurplus + emergencySurplus),
    };
  });
}

export interface LedgerSummary {
  totalObligation: number;
  totalOutstanding: number;
  totalSurplus: number;
  collectedTowardDues: number;
  collectionRate: number;
  debtorsCount: number;
  // emergency rollups
  emergencyObligation: number;
  emergencyCollected: number;
  emergencyOutstanding: number;
}

export function summarizeLedgers(ledgers: NeighborLedger[]): LedgerSummary {
  let totalObligation = 0;
  let totalOutstanding = 0;
  let totalSurplus = 0;
  let collectedTowardDues = 0;
  let debtorsCount = 0;
  let emergencyObligation = 0;
  let emergencyCollected = 0;
  let emergencyOutstanding = 0;
  for (const l of ledgers) {
    totalObligation += l.obligation;
    totalOutstanding += l.owed;
    totalSurplus += l.surplus;
    collectedTowardDues += Math.min(l.monthlyPaid, l.monthlyObligation);
    if (l.owed > 0) debtorsCount++;
    emergencyObligation += l.emergencyObligation;
    emergencyCollected += Math.min(l.emergencyPaid, l.emergencyObligation);
    emergencyOutstanding += l.emergencyOwed;
  }
  const monthlyObligationTotal = round2(
    ledgers.reduce((s, l) => s + l.monthlyObligation, 0)
  );
  const monthlyCollected = round2(collectedTowardDues);
  return {
    totalObligation: round2(totalObligation),
    totalOutstanding: round2(totalOutstanding),
    totalSurplus: round2(totalSurplus),
    collectedTowardDues: monthlyCollected,
    collectionRate:
      monthlyObligationTotal > 0
        ? Math.round((monthlyCollected / monthlyObligationTotal) * 100)
        : 0,
    debtorsCount,
    emergencyObligation: round2(emergencyObligation),
    emergencyCollected: round2(emergencyCollected),
    emergencyOutstanding: round2(emergencyOutstanding),
  };
}

export interface FundBalance {
  totalCollected: number;
  totalExpenses: number;
  balance: number;
}

/** Actual cash on hand: every payment ever received minus every expense. */
export function computeFund(
  payments: { amount: number }[],
  expenses: { amount: number }[]
): FundBalance {
  const totalCollected = round2(payments.reduce((s, p) => s + p.amount, 0));
  const totalExpenses = round2(expenses.reduce((s, e) => s + e.amount, 0));
  return {
    totalCollected,
    totalExpenses,
    balance: round2(totalCollected - totalExpenses),
  };
}

export interface FundBreakdown {
  subscriptions: number;
  emergency: number;
  totalCollected: number;
  totalExpenses: number;
  balance: number;
}

/**
 * Fund cash on hand, split by income source. Subscriptions vs emergency are
 * distinguished by whether the payment is tied to a special charge.
 */
export function computeFundBreakdown(
  payments: { amount: number; specialChargeId: number | null }[],
  expenses: { amount: number }[]
): FundBreakdown {
  let subscriptions = 0;
  let emergency = 0;
  for (const p of payments) {
    if (p.specialChargeId == null) subscriptions += p.amount;
    else emergency += p.amount;
  }
  subscriptions = round2(subscriptions);
  emergency = round2(emergency);
  const totalExpenses = round2(expenses.reduce((s, e) => s + e.amount, 0));
  const totalCollected = round2(subscriptions + emergency);
  return {
    subscriptions,
    emergency,
    totalCollected,
    totalExpenses,
    balance: round2(totalCollected - totalExpenses),
  };
}
