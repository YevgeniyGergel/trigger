import { describe, expect, it } from "vitest";
import { generateAvailableSlots } from "../slots";

// Monday 2026-07-13 .. Sunday 2026-07-19 is the reference week used below.
const MONDAY = new Date(2026, 6, 13, 0, 0, 0);
const MONDAY_WEEKDAY = MONDAY.getDay(); // 1

describe("generateAvailableSlots", () => {
  it("generates slots within working hours, spaced by session + break duration", () => {
    const slots = generateAvailableSlots({
      workingHours: [{ weekday: MONDAY_WEEKDAY, startTime: "10:00", endTime: "12:00" }],
      sessionDurationMinutes: 50,
      breakDurationMinutes: 10,
      blockedRanges: [],
      bookedRanges: [],
      fromDate: MONDAY,
      toDate: new Date(2026, 6, 13, 23, 59),
    });

    expect(slots).toHaveLength(2);
    expect(slots[0].startAt.getHours()).toBe(10);
    expect(slots[0].startAt.getMinutes()).toBe(0);
    expect(slots[0].endAt.getHours()).toBe(10);
    expect(slots[0].endAt.getMinutes()).toBe(50);
    expect(slots[1].startAt.getHours()).toBe(11);
    expect(slots[1].startAt.getMinutes()).toBe(0);
  });

  it("excludes slots outside configured weekdays", () => {
    const tuesday = new Date(2026, 6, 14, 0, 0, 0);
    const slots = generateAvailableSlots({
      workingHours: [{ weekday: MONDAY_WEEKDAY, startTime: "10:00", endTime: "12:00" }],
      sessionDurationMinutes: 50,
      breakDurationMinutes: 10,
      blockedRanges: [],
      bookedRanges: [],
      fromDate: tuesday,
      toDate: new Date(2026, 6, 14, 23, 59),
    });

    expect(slots).toHaveLength(0);
  });

  it("excludes slots overlapping a blocked range", () => {
    const slots = generateAvailableSlots({
      workingHours: [{ weekday: MONDAY_WEEKDAY, startTime: "10:00", endTime: "12:00" }],
      sessionDurationMinutes: 50,
      breakDurationMinutes: 10,
      blockedRanges: [
        { startAt: new Date(2026, 6, 13, 10, 0), endAt: new Date(2026, 6, 13, 10, 50) },
      ],
      bookedRanges: [],
      fromDate: MONDAY,
      toDate: new Date(2026, 6, 13, 23, 59),
    });

    expect(slots).toHaveLength(1);
    expect(slots[0].startAt.getHours()).toBe(11);
  });

  it("excludes slots overlapping an already-booked session", () => {
    const slots = generateAvailableSlots({
      workingHours: [{ weekday: MONDAY_WEEKDAY, startTime: "10:00", endTime: "12:00" }],
      sessionDurationMinutes: 50,
      breakDurationMinutes: 10,
      blockedRanges: [],
      bookedRanges: [
        { startAt: new Date(2026, 6, 13, 11, 0), endAt: new Date(2026, 6, 13, 11, 50) },
      ],
      fromDate: MONDAY,
      toDate: new Date(2026, 6, 13, 23, 59),
    });

    expect(slots).toHaveLength(1);
    expect(slots[0].startAt.getHours()).toBe(10);
  });

  it("excludes slots before fromDate on the first day", () => {
    const lateMorning = new Date(2026, 6, 13, 10, 30);
    const slots = generateAvailableSlots({
      workingHours: [{ weekday: MONDAY_WEEKDAY, startTime: "10:00", endTime: "12:00" }],
      sessionDurationMinutes: 50,
      breakDurationMinutes: 10,
      blockedRanges: [],
      bookedRanges: [],
      fromDate: lateMorning,
      toDate: new Date(2026, 6, 13, 23, 59),
    });

    expect(slots).toHaveLength(1);
    expect(slots[0].startAt.getHours()).toBe(11);
  });

  it("returns no slots when session duration is zero or negative", () => {
    const slots = generateAvailableSlots({
      workingHours: [{ weekday: MONDAY_WEEKDAY, startTime: "10:00", endTime: "12:00" }],
      sessionDurationMinutes: 0,
      breakDurationMinutes: 10,
      blockedRanges: [],
      bookedRanges: [],
      fromDate: MONDAY,
      toDate: new Date(2026, 6, 13, 23, 59),
    });

    expect(slots).toHaveLength(0);
  });
});
