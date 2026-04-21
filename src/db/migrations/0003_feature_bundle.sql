-- Feature bundle: reorder, pause, negative, quantitative, tags, notes, settings

ALTER TABLE habits ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS paused_at timestamptz;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS is_negative boolean NOT NULL DEFAULT false;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS target_per_day smallint;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS tag text;

ALTER TABLE completions ADD COLUMN IF NOT EXISTS note text;

-- Backfill sort_order on first rows so existing habits stay ordered by created_at
UPDATE habits
SET sort_order = sub.rn
FROM (
  SELECT id, row_number() OVER (ORDER BY created_at ASC) AS rn
  FROM habits
) sub
WHERE habits.id = sub.id AND habits.sort_order = 0;

CREATE INDEX IF NOT EXISTS habits_sort_order_idx ON habits (sort_order);

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
