-- Phase 4: Procurement Intelligence + Financial Control

-- ── purchase_orders ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id                       TEXT PRIMARY KEY,
  organization_id          TEXT NOT NULL,
  supplier_id              TEXT,
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

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_purchase_orders" ON public.purchase_orders
  USING (organization_id = public.get_user_org_id());

-- ── purchase_order_items ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id                  TEXT PRIMARY KEY,
  purchase_order_id   TEXT NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  inventory_item_id   TEXT NOT NULL,
  ordered_quantity    NUMERIC NOT NULL,
  received_quantity   NUMERIC NOT NULL DEFAULT 0,
  unit_cost_cents     INTEGER NOT NULL,
  notes               TEXT,
  sync_status         TEXT NOT NULL DEFAULT 'synced',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_purchase_order_items" ON public.purchase_order_items
  USING (
    purchase_order_id IN (
      SELECT id FROM public.purchase_orders WHERE organization_id = public.get_user_org_id()
    )
  );

-- ── financial_budgets ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.financial_budgets (
  id                   TEXT PRIMARY KEY,
  organization_id      TEXT NOT NULL,
  month                TEXT NOT NULL,  -- YYYY-MM
  category             TEXT NOT NULL,
  budget_amount_cents  INTEGER NOT NULL,
  sync_status          TEXT NOT NULL DEFAULT 'synced',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, month, category)
);

ALTER TABLE public.financial_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_financial_budgets" ON public.financial_budgets
  USING (organization_id = public.get_user_org_id());
