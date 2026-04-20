-- Archiving, weekly goals, quantitative counter
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS target_per_week smallint NOT NULL DEFAULT 7;

ALTER TABLE completions
  ADD COLUMN IF NOT EXISTS count smallint NOT NULL DEFAULT 1;

ALTER TABLE completions
  ADD CONSTRAINT completions_count_positive CHECK (count > 0);
