import { createHash, timingSafeEqual } from "node:crypto";

const LIQPAY_CHECKOUT_URL = "https://www.liqpay.ua/api/3/checkout";
const LIQPAY_VERSION = 3;

export type LiqpayCheckoutParams = {
  publicKey: string;
  privateKey: string;
  amountUah: number;
  orderId: string;
  description: string;
  resultUrl: string;
  serverUrl: string;
  sandbox: boolean;
  rroInfoEmail?: string;
};

export type LiqpayCheckoutForm = {
  action: string;
  data: string;
  signature: string;
};

function sign(privateKey: string, data: string): string {
  return createHash("sha1")
    .update(privateKey + data + privateKey)
    .digest("base64");
}

/**
 * Builds the base64 `data` payload + signature for LiqPay's classic
 * checkout flow: an HTML form POSTs these two fields directly to
 * LIQPAY_CHECKOUT_URL, and LiqPay redirects the browser to its hosted
 * payment page. No server-to-server call is needed to obtain a "link".
 */
export function buildLiqpayCheckout(params: LiqpayCheckoutParams): LiqpayCheckoutForm {
  const payload: Record<string, unknown> = {
    public_key: params.publicKey,
    version: LIQPAY_VERSION,
    action: "pay",
    amount: params.amountUah,
    currency: "UAH",
    description: params.description,
    order_id: params.orderId,
    result_url: params.resultUrl,
    server_url: params.serverUrl,
  };

  if (params.sandbox) {
    payload.sandbox = 1;
  }

  if (params.rroInfoEmail) {
    // LiqPay's built-in RRO ("Каса") sends a fiscal receipt when
    // rro_info.delivery_emails is present — verify this field name against
    // current LiqPay API docs before going to production (design.md).
    payload.rro_info = { delivery_emails: [params.rroInfoEmail] };
  }

  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = sign(params.privateKey, data);

  return { action: LIQPAY_CHECKOUT_URL, data, signature };
}

export type LiqpayCallbackPayload = {
  order_id: string;
  status: string;
  payment_id?: number | string;
  amount?: number;
  currency?: string;
};

export function decodeLiqpayData(data: string): LiqpayCallbackPayload {
  const json = Buffer.from(data, "base64").toString("utf8");
  const parsed = JSON.parse(json);
  if (typeof parsed?.order_id !== "string" || typeof parsed?.status !== "string") {
    throw new Error("Malformed LiqPay callback payload");
  }
  return parsed;
}

export function verifyLiqpaySignature(data: string, signature: string, privateKey: string): boolean {
  const expected = Buffer.from(sign(privateKey, data));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

const PAID_STATUSES = new Set(["success", "sandbox"]);
const FAILED_STATUSES = new Set(["failure", "error"]);
const REFUNDED_STATUSES = new Set(["reversed"]);

/** Statuses not covered here (e.g. "processing", "wait_accept") map to PENDING. */
export function mapLiqpayStatus(status: string): "PAID" | "FAILED" | "REFUNDED" | "PENDING" {
  if (PAID_STATUSES.has(status)) return "PAID";
  if (FAILED_STATUSES.has(status)) return "FAILED";
  if (REFUNDED_STATUSES.has(status)) return "REFUNDED";
  return "PENDING";
}
