export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram sendMessage failed (${response.status}): ${body}`);
  }
}

export function buildTelegramLinkUrl(token: string): string {
  const username = process.env.TELEGRAM_BOT_USERNAME;
  if (!username) {
    throw new Error("TELEGRAM_BOT_USERNAME is not set");
  }
  return `https://t.me/${username}?start=${token}`;
}
