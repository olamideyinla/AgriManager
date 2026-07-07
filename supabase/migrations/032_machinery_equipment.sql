-- Machinery & Equipment module (Pro tier)
-- Uses UUID ids/foreign keys to match this project's actual live schema
-- (organizations.id, farm_locations.id, enterprise_instances.id are all uuid —
-- confirmed via information_schema.columns; earlier text-based drafts of this
-- migration were based on stale conventions in older repo migration files that
-- no longer match the deployed database). Column names are camelCase→snake_case
-- to match src/core/sync/table-config.ts so the generic sync engine needs no
-- per-table mapping. The client always generates and supplies its own id
-- (crypto.randomUUID()) for offline-first sync, so gen_random_uuid() below is
-- just a safety default, never actually relied upon by the app.

-- ── machines ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.machines (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                      TEXT NOT NULL,
  category                  TEXT NOT NULL
    CHECK (category IN ('generator', 'pump', 'tractor', 'vehicle', 'processing', 'irrigation',
                         'sprayer', 'incubator', 'cold_storage', 'feed_mill', 'tools', 'other')),
  make                      TEXT,
  model                     TEXT,
  serial_number             TEXT,
  year_of_manufacture       INTEGER,
  purchase_date             DATE,
  purchase_price            NUMERIC,
  current_estimated_value   NUMERIC,
  depreciation_method       TEXT NOT NULL DEFAULT 'straight_line'
    CHECK (depreciation_method IN ('straight_line', 'none')),
  useful_life_years         INTEGER,
  residual_value            NUMERIC,
  fuel_type                 TEXT
    CHECK (fuel_type IN ('petrol', 'diesel', 'electric', 'solar', 'manual', 'none')),
  fuel_capacity_liters      NUMERIC,
  average_fuel_consumption  TEXT,
  hours_counter             NUMERIC,
  odometer_km               NUMERIC,
  assigned_location_id      UUID REFERENCES public.farm_locations(id) ON DELETE SET NULL,
  assigned_enterprise_ids   UUID[] NOT NULL DEFAULT '{}',
  status                    TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'under_repair', 'idle', 'retired', 'sold')),
  photo_url                 TEXT,
  insurance_provider        TEXT,
  insurance_policy_number   TEXT,
  insurance_expiry_date     DATE,
  notes                     TEXT,
  sync_status               TEXT NOT NULL DEFAULT 'synced',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  server_updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_machines_org             ON public.machines (organization_id);
CREATE INDEX idx_machines_org_status      ON public.machines (organization_id, status);

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_machines" ON public.machines
  USING (organization_id = get_user_org_id());

CREATE OR REPLACE FUNCTION public.set_machines_server_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.server_updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_machines_server_updated_at
  BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.set_machines_server_updated_at();

-- ── maintenance_schedules ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id            UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  interval_type         TEXT NOT NULL CHECK (interval_type IN ('hours', 'days', 'km', 'months')),
  interval_value        NUMERIC NOT NULL,
  last_performed_date   DATE,
  last_performed_hours  NUMERIC,
  last_performed_km     NUMERIC,
  next_due_date         DATE,
  next_due_hours        NUMERIC,
  next_due_km           NUMERIC,
  estimated_cost        NUMERIC,
  notes                 TEXT,
  sync_status           TEXT NOT NULL DEFAULT 'synced',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maintenance_schedules_machine   ON public.maintenance_schedules (machine_id);
CREATE INDEX idx_maintenance_schedules_next_due  ON public.maintenance_schedules (next_due_date);

ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_maintenance_schedules" ON public.maintenance_schedules
  USING (
    machine_id IN (SELECT id FROM public.machines WHERE organization_id = get_user_org_id())
  );

-- ── maintenance_records ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.maintenance_records (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id                      UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  schedule_id                     UUID REFERENCES public.maintenance_schedules(id) ON DELETE SET NULL,
  date                            DATE NOT NULL,
  type                            TEXT NOT NULL
    CHECK (type IN ('scheduled', 'repair', 'overhaul', 'inspection', 'emergency')),
  description                     TEXT NOT NULL,
  parts_used                      JSONB NOT NULL DEFAULT '[]',
  labor_description               TEXT,
  labor_cost                      NUMERIC DEFAULT 0,
  parts_cost                      NUMERIC DEFAULT 0,
  other_cost                      NUMERIC DEFAULT 0,
  total_cost                      NUMERIC NOT NULL DEFAULT 0,
  performed_by                    TEXT,
  workshop_name                   TEXT,
  hour_meter_reading              NUMERIC,
  odometer_reading                NUMERIC,
  downtime_days                   INTEGER,
  next_action_required            TEXT,
  photo_urls                      TEXT[] NOT NULL DEFAULT '{}',
  linked_financial_transaction_id UUID,
  notes                           TEXT,
  sync_status                     TEXT NOT NULL DEFAULT 'synced',
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maintenance_records_machine       ON public.maintenance_records (machine_id, date DESC);

ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_maintenance_records" ON public.maintenance_records
  USING (
    machine_id IN (SELECT id FROM public.machines WHERE organization_id = get_user_org_id())
  );

-- ── fuel_logs ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fuel_logs (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id                      UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  date                            DATE NOT NULL,
  quantity                        NUMERIC NOT NULL,
  unit_cost                       NUMERIC NOT NULL,
  total_cost                      NUMERIC NOT NULL,
  hour_meter_reading              NUMERIC,
  odometer_reading                NUMERIC,
  fuel_type                       TEXT,
  supplier                        TEXT,
  receipt_reference               TEXT,
  enterprise_instance_id          UUID REFERENCES public.enterprise_instances(id) ON DELETE SET NULL,
  linked_financial_transaction_id UUID,
  notes                           TEXT,
  sync_status                     TEXT NOT NULL DEFAULT 'synced',
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fuel_logs_machine  ON public.fuel_logs (machine_id, date DESC);

ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_fuel_logs" ON public.fuel_logs
  USING (
    machine_id IN (SELECT id FROM public.machines WHERE organization_id = get_user_org_id())
  );

-- ── usage_logs ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.usage_logs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id              UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  date                    DATE NOT NULL,
  hours_used              NUMERIC,
  km_driven               NUMERIC,
  purpose                 TEXT,
  enterprise_instance_id  UUID REFERENCES public.enterprise_instances(id) ON DELETE SET NULL,
  operated_by             TEXT,
  notes                   TEXT,
  sync_status             TEXT NOT NULL DEFAULT 'synced',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_logs_machine  ON public.usage_logs (machine_id, date DESC);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_usage_logs" ON public.usage_logs
  USING (
    machine_id IN (SELECT id FROM public.machines WHERE organization_id = get_user_org_id())
  );
