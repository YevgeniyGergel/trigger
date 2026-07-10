import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    text?: string;
  };
};

export async function POST(request: Request) {
  // Telegram sets this header on every request to a webhook registered with
  // a secret_token (setWebhook) — without it, anyone who discovers this URL
  // could forge /start <token> requests and link arbitrary chat IDs.
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "malformed body" }, { status: 400 });
  }

  const message = update.message;
  const text = message?.text;

  if (!message || !text?.startsWith("/start ")) {
    return NextResponse.json({ ok: true });
  }

  const token = text.slice("/start ".length).trim();
  const chatId = String(message.chat.id);

  if (!token) {
    return NextResponse.json({ ok: true });
  }

  const psychologist = await prisma.psychologist.findUnique({ where: { telegramLinkToken: token } });
  if (psychologist) {
    await prisma.psychologist.update({
      where: { id: psychologist.id },
      data: { telegramChatId: chatId, telegramLinkToken: null, telegramNotificationsEnabled: true },
    });
    await sendTelegramMessage(chatId, "Telegram-акаунт підключено до Trigger. Тепер ви отримуватимете сповіщення тут.");
    return NextResponse.json({ ok: true });
  }

  const client = await prisma.client.findUnique({ where: { telegramLinkToken: token } });
  if (client) {
    await prisma.client.update({
      where: { id: client.id },
      data: { telegramChatId: chatId, telegramLinkToken: null },
    });
    await sendTelegramMessage(chatId, "Telegram-акаунт підключено. Ви отримуватимете сповіщення про сесії тут.");
    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(chatId, "Посилання недійсне або вже використане.");
  return NextResponse.json({ ok: true });
}
