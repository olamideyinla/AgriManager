-- Subscriptions table — tracks paid plan per organization.
-- Records are upserted by the client after a successful Paystack payment.

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID        NOT NULL UNIQUE,
  tier                TEXT        NOT NULL DEFAULT 'free'
                      CHECK (tier IN ('free', 'pro', 'x')),
  billing_period      TEXT
                      CHECK (billing_period IN ('monthly', 'annual')),
  expires_at          TIMESTAMPTZ,
  status              TEXT        NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'expired', 'cancelled', 'grace')),
  country_code        VARCHAR(10) NOT NULL DEFAULT 'DEFAULT',
  paystack_reference  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Org members can read their own subscription
CREATE POLICY "subscription_select"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id());

-- Org members can insert their subscription (on first payment)
CREATE POLICY "subscription_insert"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_org_id());

-- Org members can update their own subscription (on renewal / upgrade)
CREATE POLICY "subscription_update"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_org_id())
  WITH CHECK (organization_id = get_user_org_id());
