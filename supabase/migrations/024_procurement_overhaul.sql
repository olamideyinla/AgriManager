-- Migration 024: Procurement overhaul (v0.8.0)
-- Adds po_number, supplier_name to purchase_orders
-- Adds item_name, unit_of_measurement; makes inventory_item_id optional in purchase_order_items
-- Adds logo_url to organizations

-- ── purchase_orders additions ──────────────────────────────────────────────────

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS po_number      TEXT,
  ADD COLUMN IF NOT EXISTS supplier_name  TEXT;

-- Back-fill existing rows with a placeholder PO number
UPDATE public.purchase_orders
  SET po_number = 'PO-' || TO_CHAR(COALESCE(order_date, NOW()::date), 'YYYYMMDD') || '-LEGACY'
  WHERE po_number IS NULL;

-- Make po_number NOT NULL after back-fill
ALTER TABLE public.purchase_orders
  ALTER COLUMN po_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS purchase_orders_po_number_org_idx
  ON public.purchase_orders (organization_id, po_number);

-- ── purchase_order_items additions ────────────────────────────────────────────

ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS item_name           TEXT,
  ADD COLUMN IF NOT EXISTS unit_of_measurement TEXT;

-- Back-fill item_name from inventory_items where possible
UPDATE public.purchase_order_items poi
  SET item_name = inv.name
  FROM public.inventory_items inv
  WHERE inv.id::text = poi.inventory_item_id
    AND poi.item_name IS NULL;

-- For any still-null rows set a placeholder
UPDATE public.purchase_order_items
  SET item_name = 'Unknown item'
  WHERE item_name IS NULL;

ALTER TABLE public.purchase_order_items
  ALTER COLUMN item_name SET NOT NULL;

-- Make inventory_item_id nullable (items can now be free-text)
ALTER TABLE public.purchase_order_items
  ALTER COLUMN inventory_item_id DROP NOT NULL;

-- ── organizations — logo_url ───────────────────────────────────────────────────

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
