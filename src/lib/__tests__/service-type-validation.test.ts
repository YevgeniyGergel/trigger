import { describe, expect, it } from "vitest";
import { serviceTypeSchema } from "../validation/service-type";

describe("serviceTypeSchema", () => {
  it("accepts a valid service", () => {
    const result = serviceTypeSchema.safeParse({
      name: "Сімейна консультація",
      slotMinutes: 120,
      breakMinutes: 15,
      priceCents: 200000,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a zero break", () => {
    const result = serviceTypeSchema.safeParse({
      name: "Інтро",
      slotMinutes: 30,
      breakMinutes: 0,
      priceCents: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a break equal to the slot duration", () => {
    const result = serviceTypeSchema.safeParse({
      name: "Стандарт",
      slotMinutes: 60,
      breakMinutes: 60,
      priceCents: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a break greater than the slot duration", () => {
    const result = serviceTypeSchema.safeParse({
      name: "Стандарт",
      slotMinutes: 60,
      breakMinutes: 70,
      priceCents: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a slot duration of zero or less", () => {
    const result = serviceTypeSchema.safeParse({
      name: "Стандарт",
      slotMinutes: 0,
      breakMinutes: 0,
      priceCents: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a name that is too short", () => {
    const result = serviceTypeSchema.safeParse({
      name: "А",
      slotMinutes: 60,
      breakMinutes: 10,
      priceCents: null,
    });
    expect(result.success).toBe(false);
  });
});
