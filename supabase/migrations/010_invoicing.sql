-- ── Migration 010: Invoicing & Receipts ──────────────────────────────────────
-- Adds 6 tables for the Pro-tier invoicing feature:
--   invoice_settings, invoices, invoice_items, invoice_payments,
--   receipts, receipt_items

-- ── invoice_settings ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoice_settings (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id            UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  next_invoice_number        INTEGER NOT NULL DEFAULT 1,
  invoice_prefix             TEXT NOT NULL DEFAULT 'INV',
  next_receipt_number        INTEGER NOT NULL DEFAULT 1,
  receipt_prefix             TEXT NOT NULL DEFAULT 'RCT',
  default_payment_terms_days INTEGER NOT NULL DEFAULT 30,
  default_notes              TEXT,
  default_terms              TEXT,
  tax_enabled                BOOLEAN NOT NULL DEFAULT FALSE,
  default_tax_rate           NUMERIC(6,3),
  tax_label                  TEXT NOT NULL DEFAULT 'Tax',
  farm_logo                  TEXT,
  farm_name                  TEXT,
  farm_address               TEXT,
  farm_phone                 TEXT,
  farm_email                 TEXT,
  bank_details               TEXT,
  mobile_money               TEXT,
  receipt_footer             TEXT,
  sync_status                TEXT NOT NULL DEFAULT 'pending',
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage invoice_settings"
  ON public.invoice_settings
  FOR ALL
  USING (get_user_org_id() = organization_id)
  WITH CHECK (get_user_org_id() = organization_id);

CREATE INDEX idx_invoice_settings_org ON public.invoice_settings (organization_id);

-- ── invoices ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoices (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_number          TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'draft',
  buyer_id                UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  buyer_name              TEXT NOT NULL,
  buyer_phone             TEXT,
  buyer_email             TEXT,
  buyer_address           TEXT,
  issue_date              DATE NOT NULL,
  due_date                DATE NOT NULL,
  subtotal                NUMERIC(15,4) NOT NULL DEFAULT 0,
  tax_rate                NUMERIC(6,3),
  tax_label               TEXT,
  tax_amount              NUMERIC(15,4),
  discount                NUMERIC(15,4),
  discount_type           TEXT,
  discount_amount         NUMERIC(15,4),
  total_amount            NUMERIC(15,4) NOT NULL DEFAULT 0,
  amount_paid             NUMERIC(15,4) NOT NULL DEFAULT 0,
  amount_due              NUMERIC(15,4) NOT NULL DEFAULT 0,
  currency                TEXT NOT NULL DEFAULT 'USD',
  notes                   TEXT,
  terms                   TEXT,
  enterprise_instance_id  UUID REFERENCES public.enterprise_instances(id) ON DELETE SET NULL,
  sync_status             TEXT NOT NULL DEFAULT 'pending',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage invoices"
  ON public.invoices
  FOR ALL
  USING (get_user_org_id() = organization_id)
  WITH CHECK (get_user_org_id() = organization_id);

CREATE INDEX idx_invoices_org         ON public.invoices (organization_id);
CREATE INDEX idx_invoices_org_status  ON public.invoices (organization_id, status);
CREATE INDEX idx_invoices_buyer       ON public.invoices (buyer_id) WHERE buyer_id IS NOT NULL;
CREATE INDEX idx_invoices_due_date    ON public.invoices (due_date);

-- ── invoice_items ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  quantity     NUMERIC(12,4) NOT NULL,
  unit         TEXT NOT NULL DEFAULT 'pcs',
  unit_price   NUMERIC(15,4) NOT NULL,
  total        NUMERIC(15,4) NOT NULL,
  sync_status  TEXT NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage invoice_items"
  ON public.invoice_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id AND get_user_org_id() = i.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id AND get_user_org_id() = i.organization_id
    )
  );

CREATE INDEX idx_invoice_items_invoice ON public.invoice_items (invoice_id);

-- ── invoice_payments ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id                      UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  receipt_id                      UUID,
  date                            DATE NOT NULL,
  amount                          NUMERIC(15,4) NOT NULL,
  payment_method                  TEXT NOT NULL DEFAULT 'cash',
  reference                       TEXT,
  notes                           TEXT,
  linked_financial_transaction_id UUID,
  sync_status                     TEXT NOT NULL DEFAULT 'pending',
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage invoice_payments"
  ON public.invoice_payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id AND get_user_org_id() = i.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_id AND get_user_org_id() = i.organization_id
    )
  );

CREATE INDEX idx_invoice_payments_invoice ON public.invoice_payments (invoice_id);
CREATE INDEX idx_invoice_payments_date    ON public.invoice_payments (date);

-- ── receipts ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.receipts (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id                 UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  receipt_number                  TEXT NOT NULL,
  type                            TEXT NOT NULL DEFAULT 'sale',
  status                          TEXT NOT NULL DEFAULT 'issued',
  buyer_id                        UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  buyer_name                      TEXT NOT NULL,
  buyer_phone                     TEXT,
  date                            DATE NOT NULL,
  subtotal                        NUMERIC(15,4) NOT NULL DEFAULT 0,
  tax_rate                        NUMERIC(6,3),
  tax_label                       TEXT,
  tax_amount                      NUMERIC(15,4),
  discount                        NUMERIC(15,4),
  discount_type                   TEXT,
  discount_amount                 NUMERIC(15,4),
  total_amount                    NUMERIC(15,4) NOT NULL DEFAULT 0,
  amount_received                 NUMERIC(15,4) NOT NULL DEFAULT 0,
  change_due                      NUMERIC(15,4) NOT NULL DEFAULT 0,
  payment_method                  TEXT NOT NULL DEFAULT 'cash',
  payment_reference               TEXT,
  linked_invoice_id               UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  linked_financial_transaction_id UUID,
  enterprise_instance_id          UUID REFERENCES public.enterprise_instances(id) ON DELETE SET NULL,
  currency                        TEXT NOT NULL DEFAULT 'USD',
  notes                           TEXT,
  sync_status                     TEXT NOT NULL DEFAULT 'pending',
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage receipts"
  ON public.receipts
  FOR ALL
  USING (get_user_org_id() = organization_id)
  WITH CHECK (get_user_org_id() = organization_id);

CREATE INDEX idx_receipts_org        ON public.receipts (organization_id);
CREATE INDEX idx_receipts_org_type   ON public.receipts (organization_id, type);
CREATE INDEX idx_receipts_org_date   ON public.receipts (organization_id, date);
CREATE INDEX idx_receipts_buyer      ON public.receipts (buyer_id) WHERE buyer_id IS NOT NULL;

-- ── receipt_items ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.receipt_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id  UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC(12,4) NOT NULL,
  unit        TEXT NOT NULL DEFAULT 'pcs',
  unit_price  NUMERIC(15,4) NOT NULL,
  total       NUMERIC(15,4) NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage receipt_items"
  ON public.receipt_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.id = receipt_id AND get_user_org_id() = r.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.id = receipt_id AND get_user_org_id() = r.organization_id
    )
  );

CREATE INDEX idx_receipt_items_receipt ON public.receipt_items (receipt_id);

-- ── updated_at triggers ───────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER set_updated_at_invoice_settings
  BEFORE UPDATE ON public.invoice_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_invoices
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_invoice_items
  BEFORE UPDATE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_invoice_payments
  BEFORE UPDATE ON public.invoice_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_receipts
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_updated_at_receipt_items
  BEFORE UPDATE ON public.receipt_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
