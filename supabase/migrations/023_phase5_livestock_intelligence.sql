-- Phase 5: Livestock Intelligence
-- Adds reproductive_events, withdrawal_records, market_prices tables

-- ── reproductive_events ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reproductive_events (
  id                    TEXT PRIMARY KEY,
  org_id                TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enterprise_instance_id TEXT NOT NULL REFERENCES public.enterprise_instances(id) ON DELETE CASCADE,
  animal_id             TEXT,
  animal_tag_id         TEXT,
  event_type            TEXT NOT NULL CHECK (event_type IN (
    'heat_observed','service_natural','service_ai',
    'pregnancy_check_positive','pregnancy_check_negative',
    'farrowing','calving','kindling','weaning','dry_off','abortion'
  )),
  event_date            DATE NOT NULL,
  litter_size           INTEGER,
  litter_size_alive     INTEGER,
  male_count            INTEGER,
  female_count          INTEGER,
  weaning_weight        NUMERIC(8,3),
  gestation_days        INTEGER,
  sire_tag_id           TEXT,
  dam_tag_id            TEXT,
  notes                 TEXT,
  recorded_by           TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reproductive_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage reproductive events"
  ON public.reproductive_events
  FOR ALL
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

CREATE INDEX idx_reproductive_events_enterprise ON public.reproductive_events (enterprise_instance_id, event_date DESC);
CREATE INDEX idx_reproductive_events_animal ON public.reproductive_events (animal_id) WHERE animal_id IS NOT NULL;


-- ── withdrawal_records ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.withdrawal_records (
  id                    TEXT PRIMARY KEY,
  org_id                TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enterprise_instance_id TEXT NOT NULL REFERENCES public.enterprise_instances(id) ON DELETE CASCADE,
  medication_name       TEXT NOT NULL,
  active_ingredient     TEXT,
  treatment_date        DATE NOT NULL,
  withdrawal_days       INTEGER NOT NULL,
  withdrawal_end_date   DATE NOT NULL,
  affects_meat          BOOLEAN NOT NULL DEFAULT FALSE,
  affects_eggs          BOOLEAN NOT NULL DEFAULT FALSE,
  affects_milk          BOOLEAN NOT NULL DEFAULT FALSE,
  number_of_animals     INTEGER,
  animal_tag_ids        TEXT,
  notes                 TEXT,
  recorded_by           TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage withdrawal records"
  ON public.withdrawal_records
  FOR ALL
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

CREATE INDEX idx_withdrawal_records_enterprise ON public.withdrawal_records (enterprise_instance_id, withdrawal_end_date DESC);


-- ── market_prices ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.market_prices (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  commodity     TEXT NOT NULL,
  price_per_unit NUMERIC(14,4) NOT NULL,
  unit          TEXT NOT NULL,
  price_date    DATE NOT NULL,
  source        TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage market prices"
  ON public.market_prices
  FOR ALL
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

CREATE INDEX idx_market_prices_org_commodity ON public.market_prices (org_id, commodity, price_date DESC);
