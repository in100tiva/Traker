import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  smallint,
  integer,
  boolean,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";

export const habits = pgTable("habits", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  emoji: text("emoji"),
  color: text("color").notNull().default("#22c55e"),
  targetPerWeek: smallint("target_per_week").notNull().default(7),
  targetPerDay: smallint("target_per_day"),
  unit: text("unit"),
  isNegative: boolean("is_negative").notNull().default(false),
  tag: text("tag"),
  schedule: smallint("schedule").notNull().default(127),
  sortOrder: integer("sort_order").notNull().default(0),
  triggerType: text("trigger_type"),
  triggerValue: jsonb("trigger_value"),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const completions = pgTable(
  "completions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    count: smallint("count").notNull().default(1),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    uniqHabitDate: uniqueIndex("uniq_habit_date").on(t.habitId, t.date),
  }),
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const xpLog = pgTable("xp_log", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  habitId: uuid("habit_id").references(() => habits.id, {
    onDelete: "set null",
  }),
  amount: integer("amount").notNull(),
  kind: text("kind").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const events = pgTable("events", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const freezes = pgTable("freezes", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  usedAt: timestamp("used_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  monthKey: text("month_key").notNull(),
  habitId: uuid("habit_id").references(() => habits.id, {
    onDelete: "set null",
  }),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
export type Completion = typeof completions.$inferSelect;
export type NewCompletion = typeof completions.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type XpLog = typeof xpLog.$inferSelect;
export type AppEvent = typeof events.$inferSelect;
export type Freeze = typeof freezes.$inferSelect;
