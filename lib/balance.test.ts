import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildLedgers,
  summarizeLedgers,
  computeFundBreakdown,
  round2,
} from "./balance";
import type {
  Neighbor,
  MonthlyDue,
  Payment,
  SpecialChargeAssignment,
} from "@/lib/db";

// ── factories ──
let pid = 0;
const neighbor = (over: Partial<Neighbor> = {}): Neighbor => ({
  id: 1,
  name: "ساكن",
  apartmentNumber: null,
  phone: null,
  active: true,
  notes: null,
  createdAt: new Date("2026-01-01"),
  ...over,
});
const due = (year: number, month: number, amount: number): MonthlyDue => ({
  id: year * 100 + month,
  year,
  month,
  amount,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});
const pay = (
  neighborId: number,
  year: number,
  month: number,
  amount: number,
  specialChargeId: number | null = null
): Payment => ({
  id: ++pid,
  neighborId,
  year,
  month,
  amount,
  paidAt: `${year}-${String(month).padStart(2, "0")}-15`,
  paymentMethod: "نقد",
  notes: null,
  receiptUrl: null,
  specialChargeId,
  createdAt: new Date(),
});
const assign = (
  chargeId: number,
  neighborId: number,
  amount: number
): SpecialChargeAssignment => ({ id: chargeId * 100 + neighborId, chargeId, neighborId, amount });

test("round2 avoids float residue", () => {
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(round2(150 / 3), 50);
});

test("monthly carry-over: surplus of one month covers the next", () => {
  const [l] = buildLedgers(
    [neighbor()],
    [due(2026, 1, 300), due(2026, 2, 300)],
    [pay(1, 2026, 1, 500)] // overpaid month 1
  );
  assert.equal(l.monthlyObligation, 600);
  assert.equal(l.monthlyPaid, 500);
  assert.equal(l.monthlyOwed, 100); // 600 - 500, NOT 300
  assert.equal(l.owed, 100);
});

test("emergency payment does NOT pay off monthly dues", () => {
  const [l] = buildLedgers(
    [neighbor()],
    [due(2026, 1, 150)],
    [pay(1, 2026, 1, 100, 5)], // 100 emergency only
    [assign(5, 1, 100)]
  );
  assert.equal(l.monthlyPaid, 0, "emergency excluded from monthly paid");
  assert.equal(l.monthlyOwed, 150, "month still fully owed");
  assert.equal(l.emergencyObligation, 100);
  assert.equal(l.emergencyPaid, 100);
  assert.equal(l.emergencyOwed, 0);
  assert.equal(l.owed, 150, "combined owed = monthly only here");
  assert.equal(l.totalPaid, 100);
});

test("monthly payment does NOT pay off an emergency charge", () => {
  const [l] = buildLedgers(
    [neighbor()],
    [due(2026, 1, 150)],
    [pay(1, 2026, 1, 150)], // monthly only
    [assign(5, 1, 100)]
  );
  assert.equal(l.monthlyOwed, 0);
  assert.equal(l.emergencyOwed, 100, "emergency still owed");
  assert.equal(l.owed, 100);
});

test("combined owed = monthlyOwed + emergencyOwed", () => {
  const [l] = buildLedgers(
    [neighbor()],
    [due(2026, 1, 150)],
    [],
    [assign(5, 1, 100)]
  );
  assert.equal(l.monthlyOwed, 150);
  assert.equal(l.emergencyOwed, 100);
  assert.equal(l.owed, 250);
  assert.equal(l.obligation, 250);
});

test("join date excludes months before the neighbor joined", () => {
  const [l] = buildLedgers(
    [neighbor({ createdAt: new Date("2026-05-02") })],
    [due(2026, 4, 150), due(2026, 5, 150)],
    []
  );
  assert.equal(l.monthlyObligation, 150); // April excluded
});

test("user scenario: April+May 150 each + 100 emergency; paid April+elec", () => {
  const [l] = buildLedgers(
    [neighbor({ createdAt: new Date("2026-04-01") })],
    [due(2026, 4, 150), due(2026, 5, 150)],
    [pay(1, 2026, 4, 150), pay(1, 2026, 4, 100, 9)], // April monthly + elec
    [assign(9, 1, 100)]
  );
  assert.equal(l.monthlyObligation, 300);
  assert.equal(l.monthlyPaid, 150);
  assert.equal(l.monthlyOwed, 150, "owes May");
  assert.equal(l.emergencyOwed, 0, "electricity paid");
  assert.equal(l.owed, 150);
  assert.equal(l.totalPaid, 250);
});

test("computeFundBreakdown splits subscriptions vs emergency", () => {
  const b = computeFundBreakdown(
    [
      { amount: 150, specialChargeId: null },
      { amount: 150, specialChargeId: null },
      { amount: 100, specialChargeId: 9 },
    ],
    [{ amount: 50 }]
  );
  assert.equal(b.subscriptions, 300);
  assert.equal(b.emergency, 100);
  assert.equal(b.totalCollected, 400);
  assert.equal(b.balance, 350);
});

test("summary rolls up emergency separately", () => {
  const ledgers = buildLedgers(
    [neighbor({ id: 1 }), neighbor({ id: 2, name: "ب" })],
    [due(2026, 1, 100)],
    [pay(1, 2026, 1, 100), pay(2, 2026, 1, 50, 7)],
    [assign(7, 1, 100), assign(7, 2, 100)]
  );
  const s = summarizeLedgers(ledgers);
  assert.equal(s.emergencyObligation, 200); // both owe 100
  assert.equal(s.emergencyCollected, 50); // only n2 paid 50
  assert.equal(s.emergencyOutstanding, 150); // n1 owes 100, n2 owes 50
});
