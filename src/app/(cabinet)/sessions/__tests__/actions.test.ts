import { beforeEach, describe, expect, it, vi } from "vitest";

const requireCurrentPsychologist = vi.fn();
const sessionUpdateMany = vi.fn();
const sessionFindUnique = vi.fn();
const sessionFindFirst = vi.fn();
const transaction = vi.fn();
const notifyClient = vi.fn();
const checkSlotConflict = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/current-psychologist", () => ({
  requireCurrentPsychologist: () => requireCurrentPsychologist(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      updateMany: (...args: unknown[]) => sessionUpdateMany(...args),
      findUnique: (...args: unknown[]) => sessionFindUnique(...args),
      findFirst: (...args: unknown[]) => sessionFindFirst(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));
vi.mock("@/lib/slot-conflict", () => ({
  checkSlotConflict: (...args: unknown[]) => checkSlotConflict(...args),
}));
vi.mock("@/lib/notifications", () => ({
  notifyClient: (...args: unknown[]) => notifyClient(...args),
  sessionCancelledForClient: (startAt: Date, sessionId: string) => ({
    subject: "Сесію скасовано",
    emailHtml: `cancelled ${sessionId}`,
    telegramText: `cancelled ${sessionId}`,
  }),
  sessionRescheduledForClient: (startAt: Date, sessionId: string) => ({
    subject: "Сесію перенесено",
    emailHtml: `rescheduled ${sessionId} ${startAt.toISOString()}`,
    telegramText: `rescheduled ${sessionId}`,
  }),
}));

const { cancelSession, rescheduleSession } = await import("../actions");

const client = { id: "client_1", email: "client@example.com", telegramChatId: null };

describe("cancelSession", () => {
  beforeEach(() => {
    requireCurrentPsychologist.mockReset().mockResolvedValue({ id: "psych_1" });
    sessionUpdateMany.mockReset();
    sessionFindUnique.mockReset();
    notifyClient.mockReset();
  });

  it("notifies the client with a cancellation message referencing the status page", async () => {
    sessionUpdateMany.mockResolvedValue({ count: 1 });
    sessionFindUnique.mockResolvedValue({
      id: "sess_1",
      startAt: new Date("2026-07-20T10:00:00Z"),
      client,
    });

    const result = await cancelSession("sess_1");

    expect(result.error).toBeUndefined();
    expect(notifyClient).toHaveBeenCalledWith(
      client,
      "CANCELLATION",
      expect.objectContaining({ subject: "Сесію скасовано", emailHtml: "cancelled sess_1" }),
      "sess_1"
    );
  });

  it("does not notify when the session was already changed (updateMany matched nothing)", async () => {
    sessionUpdateMany.mockResolvedValue({ count: 0 });

    const result = await cancelSession("sess_1");

    expect(result.error).toBeDefined();
    expect(sessionFindUnique).not.toHaveBeenCalled();
    expect(notifyClient).not.toHaveBeenCalled();
  });
});

describe("rescheduleSession", () => {
  beforeEach(() => {
    requireCurrentPsychologist.mockReset().mockResolvedValue({ id: "psych_1" });
    transaction.mockReset();
    checkSlotConflict.mockReset().mockResolvedValue(null);
    notifyClient.mockReset();
  });

  function formDataWith(startAtRaw: string) {
    const formData = new FormData();
    formData.set("startAt", startAtRaw);
    return formData;
  }

  it("notifies the client with the new date/time and a status page link", async () => {
    const existingSession = {
      id: "sess_1",
      status: "CONFIRMED",
      startAt: new Date("2026-07-20T10:00:00.000Z"),
      endAt: new Date("2026-07-20T11:00:00.000Z"),
      client,
    };
    const tx = {
      session: {
        findFirst: vi.fn().mockResolvedValue(existingSession),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

    const result = await rescheduleSession("sess_1", {}, formDataWith("2026-07-21T15:30"));

    expect(result.error).toBeUndefined();
    expect(notifyClient).toHaveBeenCalledTimes(1);
    const [notifiedClient, type, message, sessionId] = notifyClient.mock.calls[0];
    expect(notifiedClient).toBe(client);
    expect(type).toBe("RESCHEDULED");
    expect(message.subject).toBe("Сесію перенесено");
    expect(sessionId).toBe("sess_1");
  });

  it("does not notify when the reschedule fails (e.g. slot conflict)", async () => {
    const existingSession = {
      id: "sess_1",
      status: "CONFIRMED",
      startAt: new Date("2026-07-20T10:00:00.000Z"),
      endAt: new Date("2026-07-20T11:00:00.000Z"),
      client,
    };
    const tx = {
      session: {
        findFirst: vi.fn().mockResolvedValue(existingSession),
        updateMany: vi.fn(),
      },
    };
    checkSlotConflict.mockResolvedValue("session_overlap");
    transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

    const result = await rescheduleSession("sess_1", {}, formDataWith("2026-07-21T15:30"));

    expect(result.error).toBe("У цей час вже є інша сесія");
    expect(notifyClient).not.toHaveBeenCalled();
  });
});
