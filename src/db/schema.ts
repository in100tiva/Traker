import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  smallint,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const habits = pgTable("habits", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#22c55e"),
  targetPerWeek: smallint("target_per_week").notNull().default(7),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    uniqHabitDate: uniqueIndex("uniq_habit_date").on(t.habitId, t.date),
  }),
);

export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
export type Completion = typeof completions.$inferSelect;
export type NewCompletion = typeof completions.$inferInsert;
