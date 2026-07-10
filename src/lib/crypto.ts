import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function loadKey(envVar: string): Buffer {
  const base64Key = process.env[envVar];
  if (!base64Key) {
    throw new Error(`${envVar} is not set`);
  }
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) {
    throw new Error(`${envVar} must decode to exactly 32 bytes`);
  }
  return key;
}

function encryptWithKey(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

function decryptWithKey(encoded: string, key: Buffer): string {
  const raw = Buffer.from(encoded, "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/**
 * Application-level AES-256-GCM encryption for secrets stored in the
 * database (LiqPay private keys) — see design.md's "Шифрування нотаток"
 * decision. Output is base64(iv || authTag || ciphertext), so a DB dump
 * alone never reveals the plaintext — only the process holding
 * CREDENTIALS_ENCRYPTION_KEY can decrypt.
 */
export function encryptSecret(plaintext: string): string {
  return encryptWithKey(plaintext, loadKey("CREDENTIALS_ENCRYPTION_KEY"));
}

export function decryptSecret(encoded: string): string {
  return decryptWithKey(encoded, loadKey("CREDENTIALS_ENCRYPTION_KEY"));
}

/**
 * Same AES-256-GCM scheme, keyed by NOTE_ENCRYPTION_KEY — deliberately a
 * separate key/secret from CREDENTIALS_ENCRYPTION_KEY (see design.md) so
 * compromising one does not expose the other category of sensitive data.
 * Used for session-note transcript/edited/SOAP text.
 */
export function encryptNoteText(plaintext: string): string {
  return encryptWithKey(plaintext, loadKey("NOTE_ENCRYPTION_KEY"));
}

export function decryptNoteText(encoded: string): string {
  return decryptWithKey(encoded, loadKey("NOTE_ENCRYPTION_KEY"));
}
