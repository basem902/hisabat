import type { Neighbor, MonthlyDue, Payment } from "@/lib/db";

/**
 * Shared balance engine — the single source of truth for every "how much
 * remaining" figure in the app (dashboard, payments, outstandings, statement).
 *
 * Core idea: treat each neighbor as a running account ("wallet"):
 *   obligation = Σ monthly dues that apply to them (from join month onward)
 *   totalPaid  = Σ every payment they ever made
 *   net        = totalPaid − obligation
 *     net < 0  → they still owe  (owed = −net)
 *     net > 0  → surplus / paid in advance  (carried over to future months)
 *
 * Because owed/surplus come from a single net, surplus from any month
 * automatically covers other months — i.e. carry-over is built in, and a
 * neighbor can never show "owed AND surplus" at the same time.
 */

/** Round to 2 decimals — amounts are double precision, avoid 0.0001 residue. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Chronological month index so months sort/compare as a single number. */
function monthKey(year: number, month: number): number {
  return year * 12 + (month - 1);
}

/** Last calendar day of a 1-based month (for join-date eligibility). */
function endOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0);
}

export interface LedgerMonth {
  year: number;
  month: number;
  due: number;
  /** For the timeline: amount actually paid in this month.
   *  For missingMonths: amount of the pool allocated toward this month. */
  paid: number;
  /** Remaining on this month after allocation (missingMonths only). */
  remaining: number;
  /** Running account balance up to & including this month (timeline only).
   *  negative = owes, positive = credit. */
  running: number;
}

export interface NeighborLedger {
  id: number;
  name: string;
  apartmentNumber: string | null;
  phone: string | null;
  active: boolean;
  notes: string | null;
  createdAt: Date | string;
  /** Σ dues that apply to this neighbor. */
  obligation: number;
  /** Σ all payments by this neighbor. */
  totalPaid: number;
  /** Outstanding amount still owed (0 if paid up / in surplus). */
  owed: number;
  /** Credit / advance payment (0 if they owe). */
  surplus: number;
  /** Number of billable months not fully covered. */
  monthsOwed: number;
  /** Per-month shortfall breakdown (oldest first) — for /outstandings. */
  missingMonths: LedgerMonth[];
  /** Full chronological timeline with running balance — for the statement. */
  months: LedgerMonth[];
}

/**
 * Build a complete ledger for every neighbor.
 * Pure function — no DB access — so it is trivially testable and reusable
 * on both the server (page components) and inside API routes.
 */
export function buildLedgers(
  neighbors: Neighbor[],
  dues: MonthlyDue[],
  payments: Payment[]
): NeighborLedger[] {
  // Index payments: neighborId → (monthKey → summed amount), and a grand total.
  const paidByNeighborMonth = new Map<number, Map<number, number>>();
  const totalPaidByNeighbor = new Map<number, number>();
  for (const p of payments) {
    const mk = monthKey(p.year, p.month);
    let perMonth = paidByNeighborMonth.get(p.neighborId);
    if (!perMonth) {
      perMonth = new Map();
      paidByNeighborMonth.set(p.neighborId, perMonth);
    }
    perMonth.set(mk, round2((perMonth.get(mk) ?? 0) + p.amount));
    totalPaidByNeighbor.set(
      p.neighborId,
      round2((totalPaidByNeighbor.get(p.neighborId) ?? 0) + p.amount)
    );
  }

  const duesSorted = [...dues].sort(
    (a, b) => monthKey(a.year, a.month) - monthKey(b.year, b.month)
  );

  return neighbors.map((n) => {
    const created = new Date(n.createdAt);
    const perMonth = paidByNeighborMonth.get(n.id) ?? new Map<number, number>();

    // Billable due-months for this neighbor (join-date + active/inactive rules).
    const billable: { mk: number; year: number; month: number; due: number }[] =
      [];
    for (const d of duesSorted) {
      if (created > endOfMonth(d.year, d.month)) continue; // before they joined
      const mk = monthKey(d.year, d.month);
      if (!n.active && !perMonth.has(mk)) continue; // ex-resident: only paid months
      billable.push({ mk, year: d.year, month: d.month, due: round2(d.amount) });
    }

    const obligation = round2(
      billable.reduce((s, b) => s + b.due, 0)
    );
    const totalPaid = round2(totalPaidByNeighbor.get(n.id) ?? 0);
    const net = round2(totalPaid - obligation);
    const owed = net < 0 ? round2(-net) : 0;
    const surplus = net > 0 ? round2(net) : 0;

    // Breakdown: allocate the whole paid pool to billable months, oldest first.
    // Σ remaining == owed exactly (consistent, no trapped surplus).
    let pool = totalPaid;
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

    // Timeline for the statement: union of billable months + any month with a
    // payment (so every riyal shows up), with a running account balance.
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

    return {
      id: n.id,
      name: n.name,
      apartmentNumber: n.apartmentNumber,
      phone: n.phone,
      active: n.active,
      notes: n.notes,
      createdAt: n.createdAt,
      obligation,
      totalPaid,
      owed,
      surplus,
      monthsOwed: missingMonths.length,
      missingMonths,
      months,
    };
  });
}

export interface LedgerSummary {
  totalObligation: number;
  totalOutstanding: number;
  totalSurplus: number;
  /** Money that went toward dues (capped at obligation) — for collection rate. */
  collectedTowardDues: number;
  collectionRate: number; // 0..100
  debtorsCount: number;
}

export function summarizeLedgers(ledgers: NeighborLedger[]): LedgerSummary {
  let totalObligation = 0;
  let totalOutstanding = 0;
  let totalSurplus = 0;
  let collectedTowardDues = 0;
  let debtorsCount = 0;
  for (const l of ledgers) {
    totalObligation += l.obligation;
    totalOutstanding += l.owed;
    totalSurplus += l.surplus;
    collectedTowardDues += Math.min(l.totalPaid, l.obligation);
    if (l.owed > 0) debtorsCount++;
  }
  totalObligation = round2(totalObligation);
  collectedTowardDues = round2(collectedTowardDues);
  return {
    totalObligation,
    totalOutstanding: round2(totalOutstanding),
    totalSurplus: round2(totalSurplus),
    collectedTowardDues,
    collectionRate:
      totalObligation > 0
        ? Math.round((collectedTowardDues / totalObligation) * 100)
        : 0,
    debtorsCount,
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
  const totalCollected = round2(
    payments.reduce((s, p) => s + p.amount, 0)
  );
  const totalExpenses = round2(expenses.reduce((s, e) => s + e.amount, 0));
  return {
    totalCollected,
    totalExpenses,
    balance: round2(totalCollected - totalExpenses),
  };
}
