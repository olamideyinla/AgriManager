-- Phase 3: Smart Finance — recurring transactions table

CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id                     TEXT PRIMARY KEY,
  organization_id        TEXT NOT NULL,
  enterprise_instance_id TEXT,
  type                   TEXT NOT NULL CHECK (type IN ('expense','income')),
  category               TEXT NOT NULL,
  description            TEXT NOT NULL,
  amount_cents           INTEGER NOT NULL,
  frequency              TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','quarterly')),
  start_date             DATE NOT NULL,
  end_date               DATE,
  next_due_date          DATE NOT NULL,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  notes                  TEXT,
  sync_status            TEXT NOT NULL DEFAULT 'synced',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_recurring" ON public.recurring_transactions
  USING (organization_id = public.get_user_org_id());
