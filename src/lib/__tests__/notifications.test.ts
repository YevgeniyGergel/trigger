import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.fn();
const sendTelegramMessage = vi.fn();
const notificationCreate = vi.fn();

vi.mock("../email", () => ({ sendEmail: (...args: unknown[]) => sendEmail(...args) }));
vi.mock("../telegram", () => ({
  sendTelegramMessage: (...args: unknown[]) => sendTelegramMessage(...args),
}));
vi.mock("../prisma", () => ({
  prisma: { notification: { create: (...args: unknown[]) => notificationCreate(...args) } },
}));

const {
  notifyClient,
  notifyPsychologist,
  bookingConfirmationForClient,
  bookingConfirmationForPsychologist,
  sessionReminderForClient,
  sessionCancelledForClient,
  sessionRescheduledForClient,
  paymentStatusForClient,
} = await import("../notifications");

const message = { subject: "Subj", emailHtml: "<p>hi</p>", telegramText: "hi" };

function channelsOf(mock: typeof notificationCreate) {
  return mock.mock.calls.map((call) => (call[0] as { data: { channel: string; sentAt: Date | null } }).data);
}

describe("notifyClient", () => {
  beforeEach(() => {
    sendEmail.mockReset();
    sendTelegramMessage.mockReset();
    notificationCreate.mockReset();
  });

  it("sends only via Telegram when linked and delivery succeeds", async () => {
    sendTelegramMessage.mockResolvedValue(undefined);
    const client = { id: "c1", email: "c@example.com", telegramChatId: "123" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await notifyClient(client as any, "BOOKING_CONFIRMATION", message);

    expect(sendTelegramMessage).toHaveBeenCalledWith("123", "hi");
    expect(sendEmail).not.toHaveBeenCalled();
    expect(channelsOf(notificationCreate)).toEqual([
      expect.objectContaining({ channel: "TELEGRAM", sentAt: expect.any(Date) }),
    ]);
  });

  it("falls back to email when Telegram delivery fails", async () => {
    sendTelegramMessage.mockRejectedValue(new Error("bot blocked"));
    sendEmail.mockResolvedValue(undefined);
    const client = { id: "c1", email: "c@example.com", telegramChatId: "123" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await notifyClient(client as any, "BOOKING_CONFIRMATION", message);

    expect(sendTelegramMessage).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith("c@example.com", "Subj", "<p>hi</p>");
    const channels = channelsOf(notificationCreate);
    expect(channels).toEqual([
      expect.objectContaining({ channel: "TELEGRAM", sentAt: null, failedAt: expect.any(Date) }),
      expect.objectContaining({ channel: "EMAIL", sentAt: expect.any(Date) }),
    ]);
  });

  it("sends via email only when Telegram is not linked", async () => {
    sendEmail.mockResolvedValue(undefined);
    const client = { id: "c1", email: "c@example.com", telegramChatId: null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await notifyClient(client as any, "BOOKING_CONFIRMATION", message);

    expect(sendTelegramMessage).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith("c@example.com", "Subj", "<p>hi</p>");
  });

  it("does nothing when the client has neither Telegram nor email", async () => {
    const client = { id: "c1", email: null, telegramChatId: null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await notifyClient(client as any, "BOOKING_CONFIRMATION", message);

    expect(sendTelegramMessage).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(notificationCreate).not.toHaveBeenCalled();
  });
});

describe("notifyPsychologist", () => {
  beforeEach(() => {
    sendEmail.mockReset();
    sendTelegramMessage.mockReset();
    notificationCreate.mockReset();
  });

  it("sends via both channels independently when both are enabled", async () => {
    sendEmail.mockResolvedValue(undefined);
    sendTelegramMessage.mockResolvedValue(undefined);
    const psychologist = {
      id: "p1",
      email: "p@example.com",
      emailNotificationsEnabled: true,
      telegramNotificationsEnabled: true,
      telegramChatId: "456",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await notifyPsychologist(psychologist as any, "BOOKING_CONFIRMATION", message);

    expect(sendEmail).toHaveBeenCalledWith("p@example.com", "Subj", "<p>hi</p>");
    expect(sendTelegramMessage).toHaveBeenCalledWith("456", "hi");
  });

  it("skips Telegram when disabled even if linked, but still sends email", async () => {
    sendEmail.mockResolvedValue(undefined);
    const psychologist = {
      id: "p1",
      email: "p@example.com",
      emailNotificationsEnabled: true,
      telegramNotificationsEnabled: false,
      telegramChatId: "456",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await notifyPsychologist(psychologist as any, "BOOKING_CONFIRMATION", message);

    expect(sendEmail).toHaveBeenCalled();
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("a failed email doesn't suppress a subsequently-enabled Telegram send", async () => {
    sendEmail.mockRejectedValue(new Error("bounced"));
    sendTelegramMessage.mockResolvedValue(undefined);
    const psychologist = {
      id: "p1",
      email: "p@example.com",
      emailNotificationsEnabled: true,
      telegramNotificationsEnabled: true,
      telegramChatId: "456",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await notifyPsychologist(psychologist as any, "BOOKING_CONFIRMATION", message);

    expect(sendTelegramMessage).toHaveBeenCalled();
    const channels = channelsOf(notificationCreate);
    expect(channels).toEqual([
      expect.objectContaining({ channel: "EMAIL", sentAt: null, failedAt: expect.any(Date) }),
      expect.objectContaining({ channel: "TELEGRAM", sentAt: expect.any(Date) }),
    ]);
  });
});

describe("message builders", () => {
  const startAt = new Date("2026-07-13T10:00:00");

  it("bookingConfirmationForPsychologist includes the client name and time", () => {
    const msg = bookingConfirmationForPsychologist("Олена", startAt);
    expect(msg.telegramText).toContain("Олена");
    expect(msg.emailHtml).toContain("Олена");
  });

  it("bookingConfirmationForClient mentions the session is scheduled and links to the status page", () => {
    const msg = bookingConfirmationForClient(startAt, "sess_1");
    expect(msg.subject).toBe("Підтвердження запису");
    expect(msg.emailHtml).toContain("/session/sess_1");
    expect(msg.telegramText).toContain("/session/sess_1");
  });

  it("bookingConfirmationForClient states the clean session length when provided", () => {
    const msg = bookingConfirmationForClient(startAt, "sess_1", 50);
    expect(msg.emailHtml).toContain("тривалість 50 хв");
    expect(msg.telegramText).toContain("тривалість 50 хв");
  });

  it("bookingConfirmationForClient omits the length for legacy sessions without a service", () => {
    const msg = bookingConfirmationForClient(startAt, "sess_1", null);
    expect(msg.emailHtml).not.toContain("тривалість");
  });

  it("sessionReminderForClient produces a reminder message with a status page link", () => {
    const msg = sessionReminderForClient(startAt, "sess_1");
    expect(msg.subject).toBe("Нагадування про сесію");
    expect(msg.emailHtml).toContain("/session/sess_1");
  });

  it("sessionReminderForClient states the clean session length when provided", () => {
    const msg = sessionReminderForClient(startAt, "sess_1", 50);
    expect(msg.emailHtml).toContain("тривалість 50 хв");
    expect(msg.telegramText).toContain("тривалість 50 хв");
  });

  it("sessionCancelledForClient includes the status page link", () => {
    const msg = sessionCancelledForClient(startAt, "sess_1");
    expect(msg.subject).toBe("Сесію скасовано");
    expect(msg.emailHtml).toContain("/session/sess_1");
    expect(msg.telegramText).toContain("/session/sess_1");
  });

  it("sessionRescheduledForClient includes the new time and the status page link", () => {
    const newStartAt = new Date("2026-07-14T11:00:00");
    const msg = sessionRescheduledForClient(newStartAt, "sess_1");
    expect(msg.subject).toBe("Сесію перенесено");
    expect(msg.emailHtml).toContain("/session/sess_1");
  });

  it("paymentStatusForClient includes a retry link only on failure", () => {
    const failed = paymentStatusForClient(false, "sess_1");
    expect(failed.emailHtml).toContain("/pay/sess_1");

    const paid = paymentStatusForClient(true, "sess_1");
    expect(paid.emailHtml).not.toContain("/pay/sess_1");
  });
});
