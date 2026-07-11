import type { Client, NotificationType, Psychologist } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendTelegramMessage } from "@/lib/telegram";
import { formatKyiv } from "@/lib/timezone";

type Message = { subject: string; emailHtml: string; telegramText: string };

async function recordNotification(params: {
  psychologistId?: string;
  clientId?: string;
  sessionId?: string;
  type: NotificationType;
  channel: "EMAIL" | "TELEGRAM";
  ok: boolean;
  payload: string;
}) {
  await prisma.notification.create({
    data: {
      psychologistId: params.psychologistId,
      clientId: params.clientId,
      sessionId: params.sessionId,
      type: params.type,
      channel: params.channel,
      payload: params.payload,
      sentAt: params.ok ? new Date() : null,
      failedAt: params.ok ? null : new Date(),
    },
  });
}

/**
 * Psychologist channels are independent opt-ins (design.md: Telegram is an
 * "additional" channel, not a fallback) — email and Telegram are each
 * attempted whenever their toggle is on, regardless of the other's outcome.
 */
export async function notifyPsychologist(
  psychologist: Psychologist,
  type: NotificationType,
  message: Message,
  sessionId?: string
): Promise<void> {
  if (psychologist.emailNotificationsEnabled) {
    let ok = true;
    try {
      await sendEmail(psychologist.email, message.subject, message.emailHtml);
    } catch (error) {
      ok = false;
      console.error("[notifications] email to psychologist failed:", error);
    }
    await recordNotification({
      psychologistId: psychologist.id,
      sessionId,
      type,
      channel: "EMAIL",
      ok,
      payload: message.subject,
    });
  }

  if (psychologist.telegramNotificationsEnabled && psychologist.telegramChatId) {
    let ok = true;
    try {
      await sendTelegramMessage(psychologist.telegramChatId, message.telegramText);
    } catch (error) {
      ok = false;
      console.error("[notifications] telegram to psychologist failed:", error);
    }
    await recordNotification({
      psychologistId: psychologist.id,
      sessionId,
      type,
      channel: "TELEGRAM",
      ok,
      payload: message.subject,
    });
  }
}

/**
 * Client channel priority: Telegram first if linked, with email as the
 * guaranteed fallback on Telegram failure or absence (spec.md "Email
 * Fallback Guarantee" / "Unlinked client falls back to email").
 */
export async function notifyClient(
  client: Client,
  type: NotificationType,
  message: Message,
  sessionId?: string
): Promise<void> {
  let telegramOk = false;

  if (client.telegramChatId) {
    try {
      await sendTelegramMessage(client.telegramChatId, message.telegramText);
      telegramOk = true;
    } catch (error) {
      console.error("[notifications] telegram to client failed:", error);
    }
    await recordNotification({
      clientId: client.id,
      sessionId,
      type,
      channel: "TELEGRAM",
      ok: telegramOk,
      payload: message.subject,
    });
  }

  if (!telegramOk && client.email) {
    let ok = true;
    try {
      await sendEmail(client.email, message.subject, message.emailHtml);
    } catch (error) {
      ok = false;
      console.error("[notifications] email to client failed:", error);
    }
    await recordNotification({
      clientId: client.id,
      sessionId,
      type,
      channel: "EMAIL",
      ok,
      payload: message.subject,
    });
  }
}

export function bookingConfirmationForPsychologist(clientName: string, startAt: Date): Message {
  const when = formatKyiv(startAt, { dateStyle: "medium", timeStyle: "short" });
  return {
    subject: "Нове бронювання",
    emailHtml: `<p>Нове бронювання від ${clientName} на ${when}.</p>`,
    telegramText: `Нове бронювання: ${clientName}, ${when}`,
  };
}

function sessionStatusUrl(sessionId: string): string {
  return `${process.env.APP_BASE_URL ?? ""}/session/${sessionId}`;
}

// Client-facing copy states the start time plus the "clean" session length
// (slot minus break) — never the full startAt–endAt slot interval, which
// includes the psychologist's break. `null`/`undefined` (legacy sessions
// without a service) omits the length entirely.
function lengthSuffix(sessionMinutes: number | null | undefined): string {
  return sessionMinutes != null ? `, тривалість ${sessionMinutes} хв` : "";
}

// Meeting link is omitted entirely when absent (meeting-links spec: "No
// link for sessions without a meeting") rather than shown as a placeholder.
function meetingHtml(meetingUrl: string | null | undefined): string {
  return meetingUrl ? ` <a href="${meetingUrl}">Приєднатися до онлайн-зустрічі</a>.` : "";
}
function meetingText(meetingUrl: string | null | undefined): string {
  return meetingUrl ? ` Онлайн-зустріч: ${meetingUrl}` : "";
}

export function bookingConfirmationForClient(
  startAt: Date,
  sessionId: string,
  sessionMinutes?: number | null,
  meetingUrl?: string | null
): Message {
  const when = formatKyiv(startAt, { dateStyle: "medium", timeStyle: "short" });
  const length = lengthSuffix(sessionMinutes);
  const statusUrl = sessionStatusUrl(sessionId);
  return {
    subject: "Підтвердження запису",
    emailHtml: `<p>Вашу сесію заплановано на ${when}${length}. Психолог підтвердить запис найближчим часом. <a href="${statusUrl}">Перевірити статус запису</a>.${meetingHtml(meetingUrl)}</p>`,
    telegramText: `Вашу сесію заплановано на ${when}${length}. Статус запису: ${statusUrl}${meetingText(meetingUrl)}`,
  };
}

// Used when a session is created already CONFIRMED (psychologist manually
// booking it) — unlike bookingConfirmationForClient, there's no "психолог
// підтвердить" line since no further confirmation step is coming.
export function sessionConfirmedForClient(
  startAt: Date,
  sessionId: string,
  sessionMinutes?: number | null,
  meetingUrl?: string | null
): Message {
  const when = formatKyiv(startAt, { dateStyle: "medium", timeStyle: "short" });
  const length = lengthSuffix(sessionMinutes);
  const statusUrl = sessionStatusUrl(sessionId);
  return {
    subject: "Підтвердження запису",
    emailHtml: `<p>Вашу сесію заплановано на ${when}${length}. <a href="${statusUrl}">Перевірити статус запису</a>.${meetingHtml(meetingUrl)}</p>`,
    telegramText: `Вашу сесію заплановано на ${when}${length}. Статус запису: ${statusUrl}${meetingText(meetingUrl)}`,
  };
}

export function sessionReminderForClient(
  startAt: Date,
  sessionId: string,
  sessionMinutes?: number | null,
  meetingUrl?: string | null
): Message {
  const when = formatKyiv(startAt, { dateStyle: "medium", timeStyle: "short" });
  const length = lengthSuffix(sessionMinutes);
  const statusUrl = sessionStatusUrl(sessionId);
  return {
    subject: "Нагадування про сесію",
    emailHtml: `<p>Нагадуємо про вашу сесію ${when}${length}. <a href="${statusUrl}">Переглянути статус запису</a>.${meetingHtml(meetingUrl)}</p>`,
    telegramText: `Нагадуємо про вашу сесію ${when}${length}. Статус запису: ${statusUrl}${meetingText(meetingUrl)}`,
  };
}

// Comment is the psychologist's optional free-text explanation, entered at
// cancel/reschedule time — it's relayed as-is to the client but never
// persisted, so it only ever reaches them through this notification.
function commentHtml(comment: string | undefined): string {
  return comment ? ` <p>Коментар: ${comment}</p>` : "";
}
function commentText(comment: string | undefined): string {
  return comment ? ` Коментар: ${comment}` : "";
}

export function sessionCancelledForClient(
  startAt: Date,
  sessionId: string,
  comment?: string
): Message {
  const when = formatKyiv(startAt, { dateStyle: "medium", timeStyle: "short" });
  const statusUrl = sessionStatusUrl(sessionId);
  return {
    subject: "Сесію скасовано",
    emailHtml: `<p>Вашу сесію ${when} скасовано психологом. <a href="${statusUrl}">Переглянути статус запису</a>.</p>${commentHtml(comment)}`,
    telegramText: `Вашу сесію ${when} скасовано психологом. Статус запису: ${statusUrl}${commentText(comment)}`,
  };
}

export function sessionRescheduledForClient(
  newStartAt: Date,
  sessionId: string,
  comment?: string
): Message {
  const when = formatKyiv(newStartAt, { dateStyle: "medium", timeStyle: "short" });
  const statusUrl = sessionStatusUrl(sessionId);
  return {
    subject: "Сесію перенесено",
    emailHtml: `<p>Вашу сесію перенесено на ${when}. <a href="${statusUrl}">Переглянути статус запису</a>.</p>${commentHtml(comment)}`,
    telegramText: `Вашу сесію перенесено на ${when}. Статус запису: ${statusUrl}${commentText(comment)}`,
  };
}

export function paymentStatusForClient(paid: boolean, sessionId: string): Message {
  if (paid) {
    return {
      subject: "Оплату отримано",
      emailHtml: `<p>Дякуємо, оплату за сесію отримано.</p>`,
      telegramText: `Дякуємо, оплату за сесію отримано.`,
    };
  }
  const retryUrl = `${process.env.APP_BASE_URL ?? ""}/pay/${sessionId}`;
  return {
    subject: "Оплата не пройшла",
    emailHtml: `<p>Оплату за сесію не вдалось провести. <a href="${retryUrl}">Спробувати ще раз</a>.</p>`,
    telegramText: `Оплату за сесію не вдалось провести: ${retryUrl}`,
  };
}

export function paymentStatusForPsychologist(paid: boolean, clientName: string): Message {
  const subject = paid ? "Оплату отримано" : "Оплата не пройшла";
  const text = paid
    ? `Оплату від ${clientName} отримано.`
    : `Оплата від ${clientName} не пройшла.`;
  return { subject, emailHtml: `<p>${text}</p>`, telegramText: text };
}
