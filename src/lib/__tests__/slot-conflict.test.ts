import { describe, expect, it, vi } from "vitest";
import { checkSlotConflict } from "../slot-conflict";

// A hand-rolled fake of the Prisma query surface checkSlotConflict actually
// uses — enough to exercise the conflict-detection logic without a database.
function fakeTx(overrides: {
  workingHours?: { startTime: string; endTime: string }[];
  blocked?: { id: string } | null;
  sessionConflict?: { id: string } | null;
}) {
  return {
    workingHour: {
      findMany: vi.fn().mockResolvedValue(overrides.workingHours ?? []),
    },
    blockedRange: {
      findFirst: vi.fn().mockResolvedValue(overrides.blocked ?? null),
    },
    session: {
      findFirst: vi.fn().mockResolvedValue(overrides.sessionConflict ?? null),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

// 2026-07-13 is a Monday.
const monday10 = new Date("2026-07-13T10:00:00");
const monday11 = new Date("2026-07-13T11:00:00");

describe("checkSlotConflict", () => {
  it("returns outside_working_hours when no rule covers the slot", async () => {
    const tx = fakeTx({ workingHours: [] });
    const result = await checkSlotConflict(tx, {
      psychologistId: "p1",
      startAt: monday10,
      endAt: monday11,
    });
    expect(result).toBe("outside_working_hours");
  });

  it("returns null when the slot is fully inside working hours with no conflicts", async () => {
    const tx = fakeTx({ workingHours: [{ startTime: "09:00", endTime: "17:00" }] });
    const result = await checkSlotConflict(tx, {
      psychologistId: "p1",
      startAt: monday10,
      endAt: monday11,
    });
    expect(result).toBeNull();
  });

  it("returns outside_working_hours when the slot extends past the working-hours rule", async () => {
    const tx = fakeTx({ workingHours: [{ startTime: "09:00", endTime: "10:30" }] });
    const result = await checkSlotConflict(tx, {
      psychologistId: "p1",
      startAt: monday10,
      endAt: monday11,
    });
    expect(result).toBe("outside_working_hours");
  });

  it("returns blocked when the slot overlaps a blocked range", async () => {
    const tx = fakeTx({
      workingHours: [{ startTime: "09:00", endTime: "17:00" }],
      blocked: { id: "b1" },
    });
    const result = await checkSlotConflict(tx, {
      psychologistId: "p1",
      startAt: monday10,
      endAt: monday11,
    });
    expect(result).toBe("blocked");
  });

  it("returns session_overlap when another pending/confirmed session overlaps", async () => {
    const tx = fakeTx({
      workingHours: [{ startTime: "09:00", endTime: "17:00" }],
      sessionConflict: { id: "s1" },
    });
    const result = await checkSlotConflict(tx, {
      psychologistId: "p1",
      startAt: monday10,
      endAt: monday11,
    });
    expect(result).toBe("session_overlap");
  });

  it("only checks pending/confirmed sessions — a cancelled session frees its slot", async () => {
    const tx = fakeTx({ workingHours: [{ startTime: "09:00", endTime: "17:00" }] });
    await checkSlotConflict(tx, {
      psychologistId: "p1",
      startAt: monday10,
      endAt: monday11,
    });
    expect(tx.session.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: ["PENDING", "CONFIRMED"] } }),
      })
    );
  });

  it("returns session_overlap for a 120-minute booking overlapping an existing 60-minute session from a different service", async () => {
    // A 60-min session already booked 10:00-11:00; a 120-min service booking
    // 09:00-11:00 overlaps it even though the two services have different
    // slot lengths — checkSlotConflict is range-based, not service-aware.
    const tx = fakeTx({
      workingHours: [{ startTime: "09:00", endTime: "17:00" }],
      sessionConflict: { id: "s1" },
    });
    const result = await checkSlotConflict(tx, {
      psychologistId: "p1",
      startAt: new Date("2026-07-13T09:00:00"),
      endAt: new Date("2026-07-13T11:00:00"),
    });
    expect(result).toBe("session_overlap");
  });

  it("skips the working-hours check when skipWorkingHours is set, but still checks overlap", async () => {
    const tx = fakeTx({ workingHours: [] });
    const result = await checkSlotConflict(tx, {
      psychologistId: "p1",
      startAt: monday10,
      endAt: monday11,
      skipWorkingHours: true,
    });
    expect(result).toBeNull();
    expect(tx.workingHour.findMany).not.toHaveBeenCalled();
  });

  it("still returns session_overlap when skipWorkingHours is set", async () => {
    const tx = fakeTx({ workingHours: [], sessionConflict: { id: "s1" } });
    const result = await checkSlotConflict(tx, {
      psychologistId: "p1",
      startAt: monday10,
      endAt: monday11,
      skipWorkingHours: true,
    });
    expect(result).toBe("session_overlap");
  });

  it("excludes the given session id from the overlap check (reschedule flow)", async () => {
    const tx = fakeTx({ workingHours: [{ startTime: "09:00", endTime: "17:00" }] });
    await checkSlotConflict(tx, {
      psychologistId: "p1",
      startAt: monday10,
      endAt: monday11,
      excludeSessionId: "s1",
    });
    expect(tx.session.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: "s1" } }),
      })
    );
  });
});
