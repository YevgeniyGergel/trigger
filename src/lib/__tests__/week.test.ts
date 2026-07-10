import { describe, expect, it } from "vitest";
import { startOfWeek, addDays, toDateParam, parseDateParam } from "../week";

describe("week helpers", () => {
  it("startOfWeek maps a Monday to itself", () => {
    const monday = new Date(2026, 6, 13); // 2026-07-13 is a Monday
    expect(startOfWeek(monday).toDateString()).toBe(monday.toDateString());
  });

  it("startOfWeek maps a Sunday back to the preceding Monday", () => {
    const sunday = new Date(2026, 6, 19);
    expect(startOfWeek(sunday).toDateString()).toBe(new Date(2026, 6, 13).toDateString());
  });

  it("toDateParam round-trips through parseDateParam without shifting a day, regardless of UTC offset", () => {
    const date = new Date(2026, 6, 20); // local midnight, no time component
    const param = toDateParam(date);
    expect(param).toBe("2026-07-20");
    expect(parseDateParam(param).toDateString()).toBe(date.toDateString());
  });

  it("addDays(weekStart, 7) lands exactly one week later as a date param", () => {
    const weekStart = startOfWeek(new Date(2026, 6, 13));
    const nextWeek = addDays(weekStart, 7);
    expect(toDateParam(nextWeek)).toBe("2026-07-20");
  });
});
