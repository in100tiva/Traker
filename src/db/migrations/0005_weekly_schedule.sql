-- Schedule: 7-bit bitmask (bit i = dayOfWeek i, 0=Sunday..6=Saturday).
-- Default 127 (0b1111111) = todos os dias, igual ao comportamento anterior.
-- Ex: apenas seg/qua/sex = (1<<1) | (1<<3) | (1<<5) = 42

ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS schedule smallint NOT NULL DEFAULT 127;

ALTER TABLE habits
  ADD CONSTRAINT habits_schedule_range CHECK (schedule BETWEEN 1 AND 127);
