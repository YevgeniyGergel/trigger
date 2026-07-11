import { beforeEach, describe, expect, it, vi } from "vitest";

const getConnection = vi.fn();
const fetchBusyIntervals = vi.fn();

vi.mock("../connections", () => ({
  getConnection: (...args: unknown[]) => getConnection(...args),
}));
vi.mock("../google-calendar", () => ({
  fetchBusyIntervals: (...args: unknown[]) => fetchBusyIntervals(...args),
}));

const { isSlotBusy, getCachedBusyIntervals, excludeTriggerEvents, fetchBusyIntervalsUncached } = await import(
  "../busy-cache"
);

const activeConnection = { status: "ACTIVE" };

describe("excludeTriggerEvents", () => {
  it("removes busy intervals that exactly match a Trigger session interval", () => {
    const sessionRange = { startAt: new Date("2026-07-11T10:00:00Z"), endAt: new Date("2026-07-11T11:00:00Z") };
    const externalRange = { startAt: new Date("2026-07-11T14:00:00Z"), endAt: new Date("2026-07-11T15:00:00Z") };

    const result = excludeTriggerEvents([sessionRange, externalRange], [sessionRange]);

    expect(result).toEqual([externalRange]);
  });
});

describe("fetchBusyIntervalsUncached", () => {
  beforeEach(() => {
    getConnection.mockReset();
    fetchBusyIntervals.mockReset();
  });

  it("returns an empty list when there is no active Google connection", async () => {
    getConnection.mockResolvedValue(null);
    const result = await fetchBusyIntervalsUncached("psy1", new Date(), new Date());
    expect(result).toEqual([]);
    expect(fetchBusyIntervals).not.toHaveBeenCalled();
  });

  it("degrades to an empty list when the freeBusy call fails", async () => {
    getConnection.mockResolvedValue(activeConnection);
    fetchBusyIntervals.mockRejectedValue(new Error("timeout"));
    const result = await fetchBusyIntervalsUncached("psy1", new Date(), new Date());
    expect(result).toEqual([]);
  });

  it("returns intervals from a connected calendar", async () => {
    getConnection.mockResolvedValue(activeConnection);
    const range = { startAt: new Date("2026-07-11T10:00:00Z"), endAt: new Date("2026-07-11T11:00:00Z") };
    fetchBusyIntervals.mockResolvedValue([range]);
    const result = await fetchBusyIntervalsUncached("psy1", new Date(), new Date());
    expect(result).toEqual([range]);
  });
});

describe("isSlotBusy", () => {
  beforeEach(() => {
    getConnection.mockReset();
    fetchBusyIntervals.mockReset();
  });

  it("returns true when the candidate slot overlaps a busy interval", async () => {
    getConnection.mockResolvedValue(activeConnection);
    fetchBusyIntervals.mockResolvedValue([
      { startAt: new Date("2026-07-11T14:00:00Z"), endAt: new Date("2026-07-11T15:00:00Z") },
    ]);
    const busy = await isSlotBusy("psy1", new Date("2026-07-11T14:30:00Z"), new Date("2026-07-11T15:30:00Z"));
    expect(busy).toBe(true);
  });

  it("returns false when the candidate slot does not overlap", async () => {
    getConnection.mockResolvedValue(activeConnection);
    fetchBusyIntervals.mockResolvedValue([
      { startAt: new Date("2026-07-11T14:00:00Z"), endAt: new Date("2026-07-11T15:00:00Z") },
    ]);
    const busy = await isSlotBusy("psy1", new Date("2026-07-11T15:00:00Z"), new Date("2026-07-11T16:00:00Z"));
    expect(busy).toBe(false);
  });
});

describe("getCachedBusyIntervals", () => {
  beforeEach(() => {
    getConnection.mockReset();
    fetchBusyIntervals.mockReset();
  });

  it("caches the result per psychologist for subsequent calls", async () => {
    const psychologistId = `psy-${Math.random()}`;
    getConnection.mockResolvedValue(activeConnection);
    fetchBusyIntervals.mockResolvedValue([
      { startAt: new Date("2026-07-11T14:00:00Z"), endAt: new Date("2026-07-11T15:00:00Z") },
    ]);

    await getCachedBusyIntervals(psychologistId, new Date(), new Date());
    await getCachedBusyIntervals(psychologistId, new Date(), new Date());

    expect(fetchBusyIntervals).toHaveBeenCalledTimes(1);
  });
});
