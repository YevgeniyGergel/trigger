import { describe, expect, it } from "vitest";
import { checkRateLimit } from "../rate-limit";

describe("checkRateLimit", () => {
  it("allows requests up to the limit", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, 3, 60_000)).toBe(true);
    }
  });

  it("rejects requests once the limit is exceeded within the window", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, 3, 60_000);
    }
    expect(checkRateLimit(key, 3, 60_000)).toBe(false);
  });

  it("tracks separate keys independently", () => {
    const keyA = `test:${Math.random()}`;
    const keyB = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(keyA, 3, 60_000);
    }
    expect(checkRateLimit(keyA, 3, 60_000)).toBe(false);
    expect(checkRateLimit(keyB, 3, 60_000)).toBe(true);
  });

  it("resets the count once the window has elapsed", () => {
    const key = `test:${Math.random()}`;
    expect(checkRateLimit(key, 1, -1)).toBe(true);
    // windowMs is negative, so resetAt is already in the past by the next call
    expect(checkRateLimit(key, 1, -1)).toBe(true);
  });
});
