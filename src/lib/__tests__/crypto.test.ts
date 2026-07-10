import { beforeAll, describe, expect, it } from "vitest";
import { encryptSecret, decryptSecret, encryptNoteText, decryptNoteText } from "../crypto";

beforeAll(() => {
  process.env.CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  process.env.NOTE_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a plaintext value", () => {
    const encrypted = encryptSecret("liqpay-private-key-123");
    expect(encrypted).not.toContain("liqpay-private-key-123");
    expect(decryptSecret(encrypted)).toBe("liqpay-private-key-123");
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const a = encryptSecret("same-value");
    const b = encryptSecret("same-value");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same-value");
    expect(decryptSecret(b)).toBe("same-value");
  });

  it("throws when ciphertext has been tampered with", () => {
    const encrypted = encryptSecret("sensitive");
    const tampered = Buffer.from(encrypted, "base64");
    tampered[tampered.length - 1] ^= 0xff;
    expect(() => decryptSecret(tampered.toString("base64"))).toThrow();
  });
});

describe("encryptNoteText / decryptNoteText", () => {
  it("round-trips session-note transcript text", () => {
    const transcript = "Клієнт розповів про...";
    const encrypted = encryptNoteText(transcript);
    expect(encrypted).not.toContain(transcript);
    expect(decryptNoteText(encrypted)).toBe(transcript);
  });

  it("uses a different key from encryptSecret — ciphertexts aren't interchangeable", () => {
    const encrypted = encryptNoteText("shared-plaintext");
    expect(() => decryptSecret(encrypted)).toThrow();
  });
});
