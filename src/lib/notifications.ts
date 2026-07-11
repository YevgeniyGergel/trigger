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

export function bookingConfirmationForClient(startAt: Date): Message {
  const when = formatKyiv(startAt, { dateStyle: "medium", timeStyle: "short" });
  return {
    subject: "Підтвердження запису",
    emailHtml: `<p>Вашу сесію заплановано на ${when}. Психолог підтвердить запис найближчим часом.</p>`,
    telegramText: `Вашу сесію заплановано на ${when}.`,
  };
}

export function sessionReminderForClient(startAt: Date): Message {
  const when = formatKyiv(startAt, { dateStyle: "medium", timeStyle: "short" });
  return {
    subject: "Нагадування про сесію",
    emailHtml: `<p>Нагадуємо про вашу сесію ${when}.</p>`,
    telegramText: `Нагадуємо про вашу сесію ${when}.`,
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
