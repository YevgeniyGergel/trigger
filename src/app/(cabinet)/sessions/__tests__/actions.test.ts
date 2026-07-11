import { beforeEach, describe, expect, it, vi } from "vitest";

const requireCurrentPsychologist = vi.fn();
const sessionUpdateMany = vi.fn();
const sessionFindUnique = vi.fn();
const sessionFindFirst = vi.fn();
const clientFindFirst = vi.fn();
const serviceTypeFindFirst = vi.fn();
const transaction = vi.fn();
const notifyClient = vi.fn();
const checkSlotConflict = vi.fn();
const redirect = vi.fn();

class RedirectSentinel extends Error {
  constructor(readonly url: string) {
    super("NEXT_REDIRECT");
  }
}

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirect(url);
    throw new RedirectSentinel(url);
  },
}));
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
    client: {
      findFirst: (...args: unknown[]) => clientFindFirst(...args),
    },
    serviceType: {
      findFirst: (...args: unknown[]) => serviceTypeFindFirst(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));
vi.mock("@/lib/slot-conflict", () => ({
  checkSlotConflict: (...args: unknown[]) => checkSlotConflict(...args),
}));
vi.mock("@/lib/integrations/session-sync", () => ({
  syncSessionCreated: vi.fn(),
  syncSessionConfirmed: vi.fn(),
  syncSessionCancelled: vi.fn(),
  syncSessionRescheduled: vi.fn(),
  retrySessionSync: vi.fn(),
}));
vi.mock("@/lib/integrations/busy-cache", () => ({
  isSlotBusy: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/lib/notifications", () => ({
  notifyClient: (...args: unknown[]) => notifyClient(...args),
  sessionCancelledForClient: (startAt: Date, sessionId: string, comment?: string) => ({
    subject: "Сесію скасовано",
    emailHtml: `cancelled ${sessionId}${comment ? ` [${comment}]` : ""}`,
    telegramText: `cancelled ${sessionId}${comment ? ` [${comment}]` : ""}`,
  }),
  sessionRescheduledForClient: (startAt: Date, sessionId: string, comment?: string) => ({
    subject: "Сесію перенесено",
    emailHtml: `rescheduled ${sessionId} ${startAt.toISOString()}${comment ? ` [${comment}]` : ""}`,
    telegramText: `rescheduled ${sessionId}${comment ? ` [${comment}]` : ""}`,
  }),
  sessionConfirmedForClient: (startAt: Date, sessionId: string) => ({
    subject: "Підтвердження запису",
    emailHtml: `confirmed ${sessionId} ${startAt.toISOString()}`,
    telegramText: `confirmed ${sessionId}`,
  }),
}));

const { cancelSession, rescheduleSession, createManualSession, updateSessionPrice } =
  await import("../actions");

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

  it("includes the psychologist's comment in the cancellation notification", async () => {
    sessionUpdateMany.mockResolvedValue({ count: 1 });
    sessionFindUnique.mockResolvedValue({
      id: "sess_1",
      startAt: new Date("2026-07-20T10:00:00Z"),
      client,
    });

    await cancelSession("sess_1", "  вибачте, захворів  ");

    expect(notifyClient).toHaveBeenCalledWith(
      client,
      "CANCELLATION",
      expect.objectContaining({ emailHtml: expect.stringContaining("вибачте, захворів") }),
      "sess_1"
    );
  });

  it("omits the comment from the notification when it is blank", async () => {
    sessionUpdateMany.mockResolvedValue({ count: 1 });
    sessionFindUnique.mockResolvedValue({
      id: "sess_1",
      startAt: new Date("2026-07-20T10:00:00Z"),
      client,
    });

    await cancelSession("sess_1", "   ");

    expect(notifyClient).toHaveBeenCalledWith(
      client,
      "CANCELLATION",
      expect.objectContaining({ emailHtml: "cancelled sess_1" }),
      "sess_1"
    );
  });
});

describe("rescheduleSession", () => {
  beforeEach(() => {
    requireCurrentPsychologist.mockReset().mockResolvedValue({ id: "psych_1" });
    transaction.mockReset();
    checkSlotConflict.mockReset().mockResolvedValue(null);
    notifyClient.mockReset();
  });

  function formDataWith(startAtRaw: string, comment?: string) {
    const formData = new FormData();
    formData.set("startAt", startAtRaw);
    if (comment !== undefined) formData.set("comment", comment);
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

  it("includes the psychologist's comment in the reschedule notification", async () => {
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

    await rescheduleSession(
      "sess_1",
      {},
      formDataWith("2026-07-21T15:30", "  зручніше вранці  ")
    );

    const message = notifyClient.mock.calls[0][2];
    expect(message.emailHtml).toContain("зручніше вранці");
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

describe("updateSessionPrice", () => {
  beforeEach(() => {
    requireCurrentPsychologist.mockReset().mockResolvedValue({ id: "psych_1" });
    sessionUpdateMany.mockReset();
    sessionFindFirst.mockReset();
  });

  it("updates the price of an unpaid session", async () => {
    sessionUpdateMany.mockResolvedValue({ count: 1 });

    const result = await updateSessionPrice("sess_1", 1800);

    expect(result.error).toBeUndefined();
    expect(sessionUpdateMany).toHaveBeenCalledWith({
      where: { id: "sess_1", psychologistId: "psych_1", paymentStatus: { not: "PAID" } },
      data: { priceCents: 180000 },
    });
  });

  it("refuses to change the price of a paid session", async () => {
    sessionUpdateMany.mockResolvedValue({ count: 0 });
    sessionFindFirst.mockResolvedValue({ id: "sess_1", paymentStatus: "PAID" });

    const result = await updateSessionPrice("sess_1", 1800);

    expect(result.error).toBe("Сесію вже оплачено — її вартість змінити не можна");
  });

  it("returns not-found when the session does not exist", async () => {
    sessionUpdateMany.mockResolvedValue({ count: 0 });
    sessionFindFirst.mockResolvedValue(null);

    const result = await updateSessionPrice("sess_missing", 1800);

    expect(result.error).toBe("Сесію не знайдено");
  });
});

describe("createManualSession", () => {
  const service = {
    id: "svc_1",
    slotMinutes: 120,
    priceCents: 200000,
  };

  beforeEach(() => {
    requireCurrentPsychologist.mockReset().mockResolvedValue({ id: "psych_1" });
    clientFindFirst.mockReset().mockResolvedValue(client);
    serviceTypeFindFirst.mockReset().mockResolvedValue(service);
    checkSlotConflict.mockReset().mockResolvedValue(null);
    transaction.mockReset();
    redirect.mockReset();
    notifyClient.mockReset();
  });

  function formDataWith(overrides: Partial<{ clientId: string; serviceTypeId: string; startAt: string }> = {}) {
    const formData = new FormData();
    formData.set("clientId", overrides.clientId ?? client.id);
    formData.set("serviceTypeId", overrides.serviceTypeId ?? service.id);
    formData.set("startAt", overrides.startAt ?? "2026-07-21T15:30");
    return formData;
  }

  it("derives endAt and price from the service and redirects to the new session", async () => {
    const tx = {
      session: {
        create: vi.fn().mockResolvedValue({ id: "sess_new" }),
      },
    };
    transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

    await expect(createManualSession({}, formDataWith())).rejects.toThrow(RedirectSentinel);

    expect(tx.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          serviceTypeId: service.id,
          priceCents: service.priceCents,
          status: "CONFIRMED",
        }),
      })
    );
    const createdData = tx.session.create.mock.calls[0][0].data;
    const durationMs = createdData.endAt.getTime() - createdData.startAt.getTime();
    expect(durationMs).toBe(service.slotMinutes * 60_000);
    expect(redirect).toHaveBeenCalledWith("/sessions/sess_new");
  });

  it("rejects an inactive or foreign service without creating a session", async () => {
    serviceTypeFindFirst.mockResolvedValue(null);

    const result = await createManualSession({}, formDataWith());

    expect(result.error).toBe("Обрана послуга недоступна");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns a conflict error when the slot overlaps an existing session", async () => {
    const tx = { session: { create: vi.fn() } };
    checkSlotConflict.mockResolvedValue("session_overlap");
    transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

    const result = await createManualSession({}, formDataWith());

    expect(result.error).toBe("У цей час вже є інша сесія");
    expect(tx.session.create).not.toHaveBeenCalled();
  });

  it("allows booking outside working hours (manual creation overrides that check)", async () => {
    const tx = {
      session: {
        create: vi.fn().mockResolvedValue({ id: "sess_new" }),
      },
    };
    transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

    await expect(createManualSession({}, formDataWith())).rejects.toThrow(RedirectSentinel);

    expect(checkSlotConflict).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ skipWorkingHours: true })
    );
  });

  it("notifies the client that their session was booked", async () => {
    const tx = {
      session: {
        create: vi.fn().mockResolvedValue({ id: "sess_new" }),
      },
    };
    transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(tx));

    await expect(createManualSession({}, formDataWith())).rejects.toThrow(RedirectSentinel);

    expect(notifyClient).toHaveBeenCalledWith(
      client,
      "BOOKING_CONFIRMATION",
      expect.objectContaining({ subject: "Підтвердження запису" }),
      "sess_new"
    );
  });
});
