-- Migration 0001 — Emergency / one-time charges (رسوم طارئة)
-- ADDITIVE ONLY — creates two new tables + one nullable column.
-- No existing data is modified or deleted. Safe to review and apply.
--
-- Apply via Neon SQL Editor (recommended: on a Neon branch first), or any
-- psql client connected with DATABASE_URL. Idempotent (IF NOT EXISTS / guarded).

-- 1) Emergency charge definitions
CREATE TABLE IF NOT EXISTS "special_charges" (
  "id"             serial PRIMARY KEY NOT NULL,
  "title"          text NOT NULL,
  "default_amount" double precision NOT NULL,
  "charge_date"    date NOT NULL,
  "notes"          text,
  "created_at"     timestamp with time zone DEFAULT now() NOT NULL
);

-- 2) Frozen snapshot of who owes each charge and how much (per neighbor)
CREATE TABLE IF NOT EXISTS "special_charge_assignments" (
  "id"          serial PRIMARY KEY NOT NULL,
  "charge_id"   integer NOT NULL,
  "neighbor_id" integer NOT NULL,
  "amount"      double precision NOT NULL,
  CONSTRAINT "special_charge_assignments_charge_id_fk"
    FOREIGN KEY ("charge_id") REFERENCES "special_charges"("id") ON DELETE cascade,
  CONSTRAINT "special_charge_assignments_neighbor_id_fk"
    FOREIGN KEY ("neighbor_id") REFERENCES "neighbors"("id") ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "special_charge_assignment_idx"
  ON "special_charge_assignments" ("charge_id", "neighbor_id");

-- 3) Link a payment to an emergency charge (NULL = ordinary monthly payment)
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "special_charge_id" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payments_special_charge_id_fk'
  ) THEN
    ALTER TABLE "payments"
      ADD CONSTRAINT "payments_special_charge_id_fk"
      FOREIGN KEY ("special_charge_id") REFERENCES "special_charges"("id") ON DELETE cascade;
  END IF;
END $$;
