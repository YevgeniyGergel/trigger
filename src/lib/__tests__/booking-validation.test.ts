import { describe, expect, it } from "vitest";
import { bookingSchema } from "../validation/booking";

const validStartAt = "2026-07-13T10:00";

describe("bookingSchema", () => {
  it("accepts a valid submission with phone only", () => {
    const result = bookingSchema.safeParse({
      name: "Олена",
      phone: "+380501234567",
      email: "",
      startAt: validStartAt,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid submission with email only", () => {
    const result = bookingSchema.safeParse({
      name: "Олена",
      phone: "",
      email: "client@example.com",
      startAt: validStartAt,
    });
    expect(result.success).toBe(true);
  });

  it("rejects when neither phone nor email is provided", () => {
    const result = bookingSchema.safeParse({
      name: "Олена",
      phone: "",
      email: "",
      startAt: validStartAt,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a name that is too short", () => {
    const result = bookingSchema.safeParse({
      name: "О",
      phone: "+380501234567",
      email: "",
      startAt: validStartAt,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = bookingSchema.safeParse({
      name: "Олена",
      phone: "",
      email: "not-an-email",
      startAt: validStartAt,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing startAt", () => {
    const result = bookingSchema.safeParse({
      name: "Олена",
      phone: "+380501234567",
      email: "",
      startAt: "",
    });
    expect(result.success).toBe(false);
  });
});
