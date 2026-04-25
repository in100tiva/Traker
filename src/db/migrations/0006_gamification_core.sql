-- Phase 1: gamification, analytics, freeze tracking, contextual triggers

-- Contextual triggers on habits (BJ Fogg / habit stacking)
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS trigger_type text;
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS trigger_value jsonb;

-- XP log: every reward earned by the user, attributable to a kind & habit.
CREATE TABLE IF NOT EXISTS xp_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid REFERENCES habits(id) ON DELETE SET NULL,
  amount integer NOT NULL,
  kind text NOT NULL,        -- habit_check | streak_bonus | drop | milestone | freeze_grant | onboarding
  payload jsonb,             -- optional context (e.g. {"streak":7,"multiplier":1.5})
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS xp_log_created_at_idx ON xp_log (created_at);
CREATE INDEX IF NOT EXISTS xp_log_kind_idx ON xp_log (kind);

-- Generic event log for analytics / retention / notification engine
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,        -- app_open | habit_check | habit_create | streak_break | drop_grant | screen_view | activation | ...
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_type_idx ON events (type);
CREATE INDEX IF NOT EXISTS events_created_at_idx ON events (created_at);

-- Streak freezes used by the user. month_key is "YYYY-MM" so we can tally
-- per-month quotas without a date-arithmetic dance.
CREATE TABLE IF NOT EXISTS freezes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  used_at timestamptz NOT NULL DEFAULT now(),
  month_key text NOT NULL,
  habit_id uuid REFERENCES habits(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS freezes_month_idx ON freezes (month_key);
