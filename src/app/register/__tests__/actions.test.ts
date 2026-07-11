import { beforeEach, describe, expect, it, vi } from "vitest";

const psychologistCreate = vi.fn();
const psychologistFindUnique = vi.fn();
const signIn = vi.fn();

vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
}));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed") },
}));
vi.mock("@/lib/auth", () => ({
  signIn: (...args: unknown[]) => signIn(...args),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    psychologist: {
      create: (...args: unknown[]) => psychologistCreate(...args),
      findUnique: (...args: unknown[]) => psychologistFindUnique(...args),
    },
  },
}));

const { registerPsychologist } = await import("../actions");

function registrationForm() {
  const formData = new FormData();
  formData.set("name", "Олена Приклад");
  formData.set("email", "olena@example.com");
  formData.set("password", "secret-password-1");
  return formData;
}

describe("registerPsychologist", () => {
  beforeEach(() => {
    psychologistCreate.mockReset().mockResolvedValue({ id: "psych_1" });
    psychologistFindUnique.mockReset().mockResolvedValue(null);
    signIn.mockReset().mockResolvedValue(undefined);
  });

  it("creates the default service in the same create as the psychologist row", async () => {
    const result = await registerPsychologist({}, registrationForm());

    expect(result.error).toBeUndefined();
    expect(psychologistCreate).toHaveBeenCalledTimes(1);
    const data = psychologistCreate.mock.calls[0][0].data;
    expect(data.serviceTypes).toEqual({
      create: {
        name: "Стандартна консультація",
        slotMinutes: 60,
        breakMinutes: 10,
        priceCents: null,
        isDefault: true,
        active: true,
        sortOrder: 0,
      },
    });
  });

  it("does not create anything when validation fails", async () => {
    const formData = registrationForm();
    formData.set("email", "not-an-email");

    const result = await registerPsychologist({}, formData);

    expect(result.error).toBeDefined();
    expect(psychologistCreate).not.toHaveBeenCalled();
  });
});
