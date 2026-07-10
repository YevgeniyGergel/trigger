import { describe, expect, it } from "vitest";
import {
  buildLiqpayCheckout,
  decodeLiqpayData,
  verifyLiqpaySignature,
  mapLiqpayStatus,
} from "../liqpay";

describe("buildLiqpayCheckout", () => {
  it("produces a data/signature pair that verifies against the same private key", () => {
    const checkout = buildLiqpayCheckout({
      publicKey: "pub_123",
      privateKey: "priv_456",
      amountUah: 500,
      orderId: "order_1",
      description: "Сесія",
      resultUrl: "https://example.com/pay/1?status=done",
      serverUrl: "https://example.com/api/liqpay/webhook",
      sandbox: false,
    });

    expect(verifyLiqpaySignature(checkout.data, checkout.signature, "priv_456")).toBe(true);
  });

  it("rejects verification against the wrong private key", () => {
    const checkout = buildLiqpayCheckout({
      publicKey: "pub_123",
      privateKey: "priv_456",
      amountUah: 500,
      orderId: "order_1",
      description: "Сесія",
      resultUrl: "https://example.com/pay/1?status=done",
      serverUrl: "https://example.com/api/liqpay/webhook",
      sandbox: false,
    });

    expect(verifyLiqpaySignature(checkout.data, checkout.signature, "wrong_key")).toBe(false);
  });

  it("includes sandbox=1 only when sandbox is requested", () => {
    const sandboxCheckout = buildLiqpayCheckout({
      publicKey: "pub",
      privateKey: "priv",
      amountUah: 100,
      orderId: "o1",
      description: "d",
      resultUrl: "https://example.com",
      serverUrl: "https://example.com",
      sandbox: true,
    });
    const liveCheckout = buildLiqpayCheckout({
      publicKey: "pub",
      privateKey: "priv",
      amountUah: 100,
      orderId: "o1",
      description: "d",
      resultUrl: "https://example.com",
      serverUrl: "https://example.com",
      sandbox: false,
    });

    const sandboxPayload = JSON.parse(Buffer.from(sandboxCheckout.data, "base64").toString("utf8"));
    const livePayload = JSON.parse(Buffer.from(liveCheckout.data, "base64").toString("utf8"));
    expect(sandboxPayload.sandbox).toBe(1);
    expect(livePayload.sandbox).toBeUndefined();
  });

  it("includes rro_info.delivery_emails only when an email is provided", () => {
    const withEmail = buildLiqpayCheckout({
      publicKey: "pub",
      privateKey: "priv",
      amountUah: 100,
      orderId: "o1",
      description: "d",
      resultUrl: "https://example.com",
      serverUrl: "https://example.com",
      sandbox: false,
      rroInfoEmail: "client@example.com",
    });
    const payload = JSON.parse(Buffer.from(withEmail.data, "base64").toString("utf8"));
    expect(payload.rro_info).toEqual({ delivery_emails: ["client@example.com"] });
  });

  it("omits rro_info when no email is provided", () => {
    const withoutEmail = buildLiqpayCheckout({
      publicKey: "pub",
      privateKey: "priv",
      amountUah: 100,
      orderId: "o1",
      description: "d",
      resultUrl: "https://example.com",
      serverUrl: "https://example.com",
      sandbox: false,
    });
    const payload = JSON.parse(Buffer.from(withoutEmail.data, "base64").toString("utf8"));
    expect(payload.rro_info).toBeUndefined();
  });
});

describe("decodeLiqpayData", () => {
  it("throws on malformed base64/JSON", () => {
    expect(() => decodeLiqpayData("not-valid-base64-json")).toThrow();
  });

  it("throws when required fields are missing", () => {
    const malformed = Buffer.from(JSON.stringify({ status: "success" })).toString("base64");
    expect(() => decodeLiqpayData(malformed)).toThrow();
  });
});

describe("mapLiqpayStatus", () => {
  it("maps success/sandbox to PAID", () => {
    expect(mapLiqpayStatus("success")).toBe("PAID");
    expect(mapLiqpayStatus("sandbox")).toBe("PAID");
  });

  it("maps failure/error to FAILED", () => {
    expect(mapLiqpayStatus("failure")).toBe("FAILED");
    expect(mapLiqpayStatus("error")).toBe("FAILED");
  });

  it("maps reversed to REFUNDED", () => {
    expect(mapLiqpayStatus("reversed")).toBe("REFUNDED");
  });

  it("maps unrecognized statuses to PENDING", () => {
    expect(mapLiqpayStatus("processing")).toBe("PENDING");
    expect(mapLiqpayStatus("wait_accept")).toBe("PENDING");
  });
});
