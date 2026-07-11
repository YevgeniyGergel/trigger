import { describe, expect, it } from "vitest";
import { generateAvailableSlots } from "../slots";

// Monday 2026-07-13 .. Sunday 2026-07-19 is the reference week used below.
const MONDAY = new Date(2026, 6, 13, 0, 0, 0);
const MONDAY_WEEKDAY = MONDAY.getDay(); // 1

describe("generateAvailableSlots", () => {
  it("generates slots within working hours, spaced by the full slot (session + break)", () => {
    const slots = generateAvailableSlots({
      workingHours: [{ weekday: MONDAY_WEEKDAY, startTime: "10:00", endTime: "12:00" }],
      slotMinutes: 60,
      blockedRanges: [],
      bookedRanges: [],
      fromDate: MONDAY,
      toDate: new Date(2026, 6, 13, 23, 59),
    });

    expect(slots).toHaveLength(2);
    expect(slots[0].startAt.getHours()).toBe(10);
    expect(slots[0].startAt.getMinutes()).toBe(0);
    expect(slots[0].endAt.getHours()).toBe(11);
    expect(slots[0].endAt.getMinutes()).toBe(0);
    expect(slots[1].startAt.getHours()).toBe(11);
    expect(slots[1].startAt.getMinutes()).toBe(0);
  });

  it("excludes slots outside configured weekdays", () => {
    const tuesday = new Date(2026, 6, 14, 0, 0, 0);
    const slots = generateAvailableSlots({
      workingHours: [{ weekday: MONDAY_WEEKDAY, startTime: "10:00", endTime: "12:00" }],
      slotMinutes: 60,
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
      slotMinutes: 60,
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
      slotMinutes: 60,
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
      slotMinutes: 60,
      blockedRanges: [],
      bookedRanges: [],
      fromDate: lateMorning,
      toDate: new Date(2026, 6, 13, 23, 59),
    });

    expect(slots).toHaveLength(1);
    expect(slots[0].startAt.getHours()).toBe(11);
  });

  it("returns no slots when slot duration is zero or negative", () => {
    const slots = generateAvailableSlots({
      workingHours: [{ weekday: MONDAY_WEEKDAY, startTime: "10:00", endTime: "12:00" }],
      slotMinutes: 0,
      blockedRanges: [],
      bookedRanges: [],
      fromDate: MONDAY,
      toDate: new Date(2026, 6, 13, 23, 59),
    });

    expect(slots).toHaveLength(0);
  });

  it("mixed-duration services align on round wall-clock times within the same working-hour window", () => {
    const workingHours = [{ weekday: MONDAY_WEEKDAY, startTime: "09:00", endTime: "13:00" }];

    const thirtyMinSlots = generateAvailableSlots({
      workingHours,
      slotMinutes: 30,
      blockedRanges: [],
      bookedRanges: [],
      fromDate: MONDAY,
      toDate: new Date(2026, 6, 13, 23, 59),
    });
    const hundredTwentyMinSlots = generateAvailableSlots({
      workingHours,
      slotMinutes: 120,
      blockedRanges: [],
      bookedRanges: [],
      fromDate: MONDAY,
      toDate: new Date(2026, 6, 13, 23, 59),
    });

    // 09:00-13:00 in 30-min steps => 8 slots, all on the hour or half-hour.
    expect(thirtyMinSlots).toHaveLength(8);
    for (const slot of thirtyMinSlots) {
      expect(slot.startAt.getMinutes() % 30).toBe(0);
    }

    // 09:00-13:00 in 120-min steps => 2 slots (09:00, 11:00), both on the hour.
    expect(hundredTwentyMinSlots).toHaveLength(2);
    expect(hundredTwentyMinSlots[0].startAt.getHours()).toBe(9);
    expect(hundredTwentyMinSlots[0].startAt.getMinutes()).toBe(0);
    expect(hundredTwentyMinSlots[1].startAt.getHours()).toBe(11);
    expect(hundredTwentyMinSlots[1].startAt.getMinutes()).toBe(0);
  });

  it("a 120-minute grid drops a trailing window shorter than the slot", () => {
    const slots = generateAvailableSlots({
      workingHours: [{ weekday: MONDAY_WEEKDAY, startTime: "09:00", endTime: "14:30" }],
      slotMinutes: 120,
      blockedRanges: [],
      bookedRanges: [],
      fromDate: MONDAY,
      toDate: new Date(2026, 6, 13, 23, 59),
    });

    // 09:00, 11:00 fit; 13:00-15:00 doesn't fit before 14:30, so it's dropped.
    expect(slots).toHaveLength(2);
  });
});
