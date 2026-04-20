-- Initial schema: habits and completions
CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#22c55e',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_habit_date
  ON completions (habit_id, date);
