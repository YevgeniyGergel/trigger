"use server";

import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { buildLiqpayCheckout, type LiqpayCheckoutForm } from "@/lib/liqpay";
import { getSessionAmountCents } from "@/lib/session-price";
import { formatKyiv } from "@/lib/timezone";

export type StartPaymentResult = { error: string } | LiqpayCheckoutForm;

export async function startPayment(sessionId: string): Promise<StartPaymentResult> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { psychologist: true, client: true },
  });
  if (!session) {
    return { error: "Сесію не знайдено" };
  }
  if (session.paymentStatus === "PAID") {
    return { error: "Сесію вже оплачено" };
  }

  const amountCents = getSessionAmountCents(session);
  if (amountCents == null) {
    return { error: "Вартість сесії не вказана" };
  }

  const { psychologist } = session;
  if (!psychologist.liqpayPublicKey || !psychologist.liqpayPrivateKeyEnc) {
    return { error: "Психолог ще не підключив оплату" };
  }

  let privateKey: string;
  try {
    privateKey = decryptSecret(psychologist.liqpayPrivateKeyEnc);
  } catch (error) {
    console.error(`[pay] failed to decrypt LiqPay private key for session ${sessionId}:`, error);
    return { error: "Оплата тимчасово недоступна. Спробуйте пізніше." };
  }

  // Reuse an in-flight PENDING attempt if one exists (avoids piling up
  // duplicate Payment rows on page refresh); a prior FAILED attempt is left
  // alone and a fresh row is created here instead — that's the retry path.
  let payment = await prisma.payment.findFirst({
    where: { sessionId: session.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (!payment) {
    payment = await prisma.payment.create({
      data: { sessionId: session.id, provider: "liqpay", amountCents, status: "PENDING" },
    });
  }

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  const checkout = buildLiqpayCheckout({
    publicKey: psychologist.liqpayPublicKey,
    privateKey,
    amountUah: amountCents / 100,
    orderId: payment.id,
    description: `Сесія з ${psychologist.name}, ${formatKyiv(session.startAt, { dateStyle: "medium" })}`,
    resultUrl: `${baseUrl}/pay/${session.id}?status=done`,
    serverUrl: `${baseUrl}/api/liqpay/webhook`,
    sandbox: psychologist.liqpayMode === "TEST",
    rroInfoEmail: session.client.email ?? undefined,
  });

  if (session.paymentStatus !== "PENDING") {
    await prisma.session.update({
      where: { id: session.id },
      data: { paymentStatus: "PENDING" },
    });
  }

  return checkout;
}
