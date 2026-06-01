import {
  pgTable,
  text,
  serial,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  buildingName: text("building_name").notNull().default("مبنى السكن"),
  currency: text("currency").notNull().default("ر.س"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const neighbors = pgTable("neighbors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  apartmentNumber: text("apartment_number"),
  phone: text("phone"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Monthly due — uniform amount expected from each active neighbor for a given (year, month).
 * Set per-month, applies to everyone.
 */
export const monthlyDues = pgTable(
  "monthly_dues",
  {
    id: serial("id").primaryKey(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    amount: doublePrecision("amount").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    yearMonthIdx: uniqueIndex("monthly_dues_year_month_idx").on(
      table.year,
      table.month
    ),
  })
);

/**
 * One-time / emergency charge (رسم طارئ) — e.g. an electricity meter payment.
 * Tracked separately from monthly dues. `defaultAmount` is the suggested amount
 * per neighbor; the authoritative per-neighbor amounts live in the assignments
 * table (a frozen snapshot of who owes the charge at creation time).
 */
export const specialCharges = pgTable("special_charges", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  defaultAmount: doublePrecision("default_amount").notNull(),
  chargeDate: date("charge_date", { mode: "string" }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Frozen snapshot of which neighbors a special charge applies to, and how much
 * each owes — captured when the charge is created. Decoupling from the live
 * neighbor list keeps historical balances stable even if a neighbor later
 * leaves or is deactivated.
 */
export const specialChargeAssignments = pgTable(
  "special_charge_assignments",
  {
    id: serial("id").primaryKey(),
    chargeId: integer("charge_id")
      .notNull()
      .references(() => specialCharges.id, { onDelete: "cascade" }),
    neighborId: integer("neighbor_id")
      .notNull()
      .references(() => neighbors.id, { onDelete: "cascade" }),
    amount: doublePrecision("amount").notNull(),
  },
  (table) => ({
    chargeNeighborIdx: uniqueIndex("special_charge_assignment_idx").on(
      table.chargeId,
      table.neighborId
    ),
  })
);

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  neighborId: integer("neighbor_id")
    .notNull()
    .references(() => neighbors.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  amount: doublePrecision("amount").notNull(),
  paidAt: date("paid_at", { mode: "string" }).notNull(),
  paymentMethod: text("payment_method").notNull().default("نقد"),
  notes: text("notes"),
  receiptUrl: text("receipt_url"),
  // When set, this payment is toward an emergency charge (not a monthly due).
  specialChargeId: integer("special_charge_id").references(
    () => specialCharges.id,
    { onDelete: "cascade" }
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  expenseDate: date("expense_date", { mode: "string" }).notNull(),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Neighbor = typeof neighbors.$inferSelect;
export type NewNeighbor = typeof neighbors.$inferInsert;
export type MonthlyDue = typeof monthlyDues.$inferSelect;
export type NewMonthlyDue = typeof monthlyDues.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type SpecialCharge = typeof specialCharges.$inferSelect;
export type NewSpecialCharge = typeof specialCharges.$inferInsert;
export type SpecialChargeAssignment =
  typeof specialChargeAssignments.$inferSelect;
export type NewSpecialChargeAssignment =
  typeof specialChargeAssignments.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
