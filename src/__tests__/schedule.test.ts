import { describe, it, expect } from "vitest";
import {
  ALL_DAYS_SCHEDULE,
  countScheduledDays,
  isScheduledOn,
  isScheduledOnDow,
  latestScheduledDayAtOrBefore,
  nextScheduledDay,
  prevScheduledDay,
  scheduleLabel,
  scheduledDows,
  setDowInSchedule,
  toggleDowInSchedule,
} from "@/lib/schedule";
import { fromDateKey } from "@/lib/date";

const MON_WED_FRI = 0b0101010; // dow 1, 3, 5
const WEEKDAYS = 0b0111110; // dow 1..5
const WEEKEND = 0b1000001; // dow 0, 6

describe("schedule bitmask", () => {
  it("ALL_DAYS_SCHEDULE has 7 bits set", () => {
    expect(ALL_DAYS_SCHEDULE).toBe(127);
    expect(countScheduledDays(ALL_DAYS_SCHEDULE)).toBe(7);
  });

  it("isScheduledOnDow for Mon/Wed/Fri", () => {
    expect(isScheduledOnDow(MON_WED_FRI, 0)).toBe(false); // Sun
    expect(isScheduledOnDow(MON_WED_FRI, 1)).toBe(true);  // Mon
    expect(isScheduledOnDow(MON_WED_FRI, 2)).toBe(false); // Tue
    expect(isScheduledOnDow(MON_WED_FRI, 3)).toBe(true);  // Wed
    expect(isScheduledOnDow(MON_WED_FRI, 5)).toBe(true);  // Fri
    expect(isScheduledOnDow(MON_WED_FRI, 6)).toBe(false); // Sat
  });

  it("isScheduledOn accepts a Date", () => {
    // 2026-04-20 is a Monday → dow 1
    const mon = fromDateKey("2026-04-20");
    expect(isScheduledOn(MON_WED_FRI, mon)).toBe(true);
    const tue = fromDateKey("2026-04-21");
    expect(isScheduledOn(MON_WED_FRI, tue)).toBe(false);
  });

  it("scheduledDows returns the correct array", () => {
    expect(scheduledDows(MON_WED_FRI)).toEqual([1, 3, 5]);
    expect(scheduledDows(WEEKEND)).toEqual([0, 6]);
  });

  it("setDowInSchedule adds / removes bits", () => {
    const added = setDowInSchedule(MON_WED_FRI, 2, true); // add Tue
    expect(isScheduledOnDow(added, 2)).toBe(true);
    const removed = setDowInSchedule(MON_WED_FRI, 1, false);
    expect(isScheduledOnDow(removed, 1)).toBe(false);
  });

  it("toggleDowInSchedule flips the bit", () => {
    const flipped = toggleDowInSchedule(MON_WED_FRI, 1);
    expect(isScheduledOnDow(flipped, 1)).toBe(false);
    const back = toggleDowInSchedule(flipped, 1);
    expect(isScheduledOnDow(back, 1)).toBe(true);
  });

  describe("scheduleLabel", () => {
    it("calls out common patterns", () => {
      expect(scheduleLabel(ALL_DAYS_SCHEDULE)).toBe("Todos os dias");
      expect(scheduleLabel(WEEKDAYS)).toBe("Seg a Sex");
      expect(scheduleLabel(WEEKEND)).toBe("Sábado e domingo");
    });

    it("lists selected days otherwise", () => {
      expect(scheduleLabel(MON_WED_FRI)).toBe("Seg, Qua, Sex");
    });
  });

  describe("nextScheduledDay / prevScheduledDay", () => {
    it("finds next Mon from a Friday when schedule=Mon/Wed/Fri", () => {
      const fri = fromDateKey("2026-04-17"); // Friday
      const next = nextScheduledDay(fri, MON_WED_FRI);
      expect(next.getDay()).toBe(1); // Monday
    });

    it("finds previous Fri from a Monday", () => {
      const mon = fromDateKey("2026-04-20"); // Monday
      const prev = prevScheduledDay(mon, MON_WED_FRI);
      expect(prev.getDay()).toBe(5); // Friday
    });
  });

  it("latestScheduledDayAtOrBefore returns today if scheduled, else previous", () => {
    const mon = fromDateKey("2026-04-20");
    const tue = fromDateKey("2026-04-21");
    expect(latestScheduledDayAtOrBefore(mon, MON_WED_FRI).getDay()).toBe(1);
    // From Tuesday → previous scheduled is Monday
    expect(latestScheduledDayAtOrBefore(tue, MON_WED_FRI).getDay()).toBe(1);
  });
});
