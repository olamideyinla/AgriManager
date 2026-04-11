-- Migration 025: Procurement + Overhaul (consolidated, idempotent)
-- Combines 022_phase4_procurement + 024_procurement_overhaul into one safe script.
-- Safe to run even if 022 or 024 was partially applied.
-- Fix: all id/organization_id columns use UUID to match the rest of the schema.

-- ── purchase_orders ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_id              UUID,
  supplier_name            TEXT,
  po_number                TEXT,
  status                   TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ordered', 'partially_received', 'received', 'cancelled')),
  order_date               DATE NOT NULL,
  expected_delivery_date   DATE,
  actual_delivery_date     DATE,
  notes                    TEXT,
  total_amount_cents       INTEGER NOT NULL DEFAULT 0,
  sync_status              TEXT NOT NULL DEFAULT 'synced',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns in case table already existed from migration 022
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS supplier_name TEXT,
  ADD COLUMN IF NOT EXISTS po_number     TEXT;

-- Back-fill po_number for any rows without one
UPDATE public.purchase_orders
  SET po_number = 'PO-' || TO_CHAR(COALESCE(order_date, NOW()::date), 'YYYYMMDD') || '-LEGACY'
  WHERE po_number IS NULL;

-- Make po_number NOT NULL after back-fill
ALTER TABLE public.purchase_orders
  ALTER COLUMN po_number SET NOT NULL;

-- Unique index: one po_number per org
CREATE UNIQUE INDEX IF NOT EXISTS purchase_orders_po_number_org_idx
  ON public.purchase_orders (organization_id, po_number);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_purchase_orders" ON public.purchase_orders;
CREATE POLICY "org_members_purchase_orders" ON public.purchase_orders
  USING (organization_id = public.get_user_org_id());

-- ── purchase_order_items ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id   UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id   UUID,               -- nullable: free-text items have no inventory link
  item_name           TEXT,               -- populated for all rows (required after migration)
  unit_of_measurement TEXT,
  ordered_quantity    NUMERIC NOT NULL,
  received_quantity   NUMERIC NOT NULL DEFAULT 0,
  unit_cost_cents     INTEGER NOT NULL,
  notes               TEXT,
  sync_status         TEXT NOT NULL DEFAULT 'synced',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns in case table already existed from migration 022
ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS item_name           TEXT,
  ADD COLUMN IF NOT EXISTS unit_of_measurement TEXT;

-- Back-fill item_name from linked inventory items where possible
UPDATE public.purchase_order_items poi
  SET item_name = inv.name
  FROM public.inventory_items inv
  WHERE inv.id = poi.inventory_item_id
    AND poi.item_name IS NULL;

-- Fallback back-fill for rows with no linked inventory item
UPDATE public.purchase_order_items
  SET item_name = 'Unknown item'
  WHERE item_name IS NULL;

ALTER TABLE public.purchase_order_items
  ALTER COLUMN item_name SET NOT NULL;

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_purchase_order_items" ON public.purchase_order_items;
CREATE POLICY "org_members_purchase_order_items" ON public.purchase_order_items
  USING (
    purchase_order_id IN (
      SELECT id FROM public.purchase_orders
      WHERE organization_id = public.get_user_org_id()
    )
  );

-- ── financial_budgets ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.financial_budgets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  month                TEXT NOT NULL,  -- YYYY-MM
  category             TEXT NOT NULL,
  budget_amount_cents  INTEGER NOT NULL,
  sync_status          TEXT NOT NULL DEFAULT 'synced',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, month, category)
);

ALTER TABLE public.financial_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_financial_budgets" ON public.financial_budgets;
CREATE POLICY "org_members_financial_budgets" ON public.financial_budgets
  USING (organization_id = public.get_user_org_id());

-- ── organizations — logo_url ───────────────────────────────────────────────────

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
