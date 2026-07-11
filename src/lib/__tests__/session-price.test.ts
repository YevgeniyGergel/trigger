import { describe, expect, it } from "vitest";
import { getSessionAmountCents } from "../session-price";

describe("getSessionAmountCents", () => {
  it("returns the session's own price when set", () => {
    expect(getSessionAmountCents({ priceCents: 15000 })).toBe(15000);
  });

  it("preserves an explicit 0 (free session)", () => {
    expect(getSessionAmountCents({ priceCents: 0 })).toBe(0);
  });

  it("returns null when the session has no price", () => {
    expect(getSessionAmountCents({ priceCents: null })).toBeNull();
  });
});
