import { describe, expect, it } from "vitest";
import { getSessionAmountCents } from "../session-price";

describe("getSessionAmountCents", () => {
  it("uses the session's own price when set", () => {
    expect(
      getSessionAmountCents({ priceCents: 15000, psychologist: { defaultSessionPriceCents: 20000 } })
    ).toBe(15000);
  });

  it("falls back to the psychologist's default price when the session has none", () => {
    expect(
      getSessionAmountCents({ priceCents: null, psychologist: { defaultSessionPriceCents: 20000 } })
    ).toBe(20000);
  });

  it("preserves an explicit 0 (free session) instead of falling back", () => {
    expect(
      getSessionAmountCents({ priceCents: 0, psychologist: { defaultSessionPriceCents: 20000 } })
    ).toBe(0);
  });

  it("returns null when neither the session nor the psychologist has a price", () => {
    expect(
      getSessionAmountCents({ priceCents: null, psychologist: { defaultSessionPriceCents: null } })
    ).toBeNull();
  });
});
