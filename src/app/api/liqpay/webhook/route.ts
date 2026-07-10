import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { decodeLiqpayData, verifyLiqpaySignature, mapLiqpayStatus } from "@/lib/liqpay";
import {
  notifyPsychologist,
  notifyClient,
  paymentStatusForClient,
  paymentStatusForPsychologist,
} from "@/lib/notifications";

export async function POST(request: Request) {
  const formData = await request.formData();
  const data = formData.get("data");
  const signature = formData.get("signature");

  if (typeof data !== "string" || typeof signature !== "string") {
    console.error("[liqpay webhook] missing data/signature fields");
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  let callback;
  try {
    callback = decodeLiqpayData(data);
  } catch {
    console.error("[liqpay webhook] malformed data payload");
    return NextResponse.json({ error: "malformed data" }, { status: 400 });
  }

  // order_id comes from an untrusted, not-yet-verified payload — it's only
  // used to look up which psychologist's private key to verify the
  // signature against, never to act on the payment status directly.
  const payment = await prisma.payment.findUnique({
    where: { id: callback.order_id },
    include: { session: { include: { psychologist: true, client: true } } },
  });
  if (!payment || !payment.session.psychologist.liqpayPrivateKeyEnc) {
    console.error(`[liqpay webhook] unknown order_id: ${callback.order_id}`);
    return NextResponse.json({ error: "unknown order" }, { status: 400 });
  }

  let privateKey: string;
  try {
    privateKey = decryptSecret(payment.session.psychologist.liqpayPrivateKeyEnc);
  } catch (error) {
    console.error(`[liqpay webhook] failed to decrypt private key for order_id: ${callback.order_id}`, error);
    return NextResponse.json({ error: "decryption failed" }, { status: 400 });
  }

  if (!verifyLiqpaySignature(data, signature, privateKey)) {
    console.error(`[liqpay webhook] invalid signature for order_id: ${callback.order_id}`);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const status = mapLiqpayStatus(callback.status);

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        providerTransactionId:
          callback.payment_id != null ? String(callback.payment_id) : null,
        rawWebhookPayload: data,
      },
    }),
    prisma.session.update({
      where: { id: payment.sessionId },
      data: { paymentStatus: status },
    }),
  ]);

  if (status === "PAID" || status === "FAILED") {
    try {
      const paid = status === "PAID";
      await notifyClient(
        payment.session.client,
        "PAYMENT_STATUS",
        paymentStatusForClient(paid, payment.sessionId),
        payment.sessionId
      );
      await notifyPsychologist(
        payment.session.psychologist,
        "PAYMENT_STATUS",
        paymentStatusForPsychologist(paid, payment.session.client.name),
        payment.sessionId
      );
    } catch (error) {
      console.error("[liqpay webhook] notification dispatch failed:", error);
    }
  }

  return NextResponse.json({ ok: true });
}
