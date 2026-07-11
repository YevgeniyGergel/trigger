import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const MAX_AGE_MS = 10 * 60 * 1000;

function signingKey(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

/**
 * Signed CSRF `state` for the OAuth connect/callback round trip (design.md
 * D7) — carries the psychologist id through the redirect to Google/Zoom and
 * back without a server-side session store, while proving on return that
 * the callback wasn't forged and isn't a replay of an old request.
 */
export function createOAuthState(psychologistId: string): string {
  const payload = JSON.stringify({ psychologistId, nonce: randomUUID(), ts: Date.now() });
  const encodedPayload = Buffer.from(payload, "utf8").toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyOAuthState(state: string): { psychologistId: string } | null {
  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = sign(encodedPayload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
      psychologistId: string;
      nonce: string;
      ts: number;
    };
    if (Date.now() - payload.ts > MAX_AGE_MS) {
      return null;
    }
    return { psychologistId: payload.psychologistId };
  } catch {
    return null;
  }
}
