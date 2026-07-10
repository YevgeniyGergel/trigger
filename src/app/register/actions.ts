"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation/psychologist";
import { slugify } from "@/lib/slug";
import { signIn } from "@/lib/auth";
import { isUniqueConstraintError } from "@/lib/prisma-errors";

export type RegisterState = {
  error?: string;
};

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "psycholog";
  let candidate = base;
  let suffix = 1;

  while (await prisma.psychologist.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

export async function registerPsychologist(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некоректні дані" };
  }

  const { name, email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  // The uniqueness checks below are best-effort pre-validation; the database's
  // unique constraints (caught as P2002) are the actual source of truth under
  // concurrent registrations racing on the same email or generated slug.
  let attemptsLeft = 3;
  while (attemptsLeft > 0) {
    attemptsLeft -= 1;
    const slug = await generateUniqueSlug(name);

    try {
      await prisma.psychologist.create({
        data: { name, email, passwordHash, slug },
      });
      break;
    } catch (error) {
      if (isUniqueConstraintError(error, "email")) {
        return { error: "Психолог з таким email вже зареєстрований" };
      }
      if (isUniqueConstraintError(error, "slug") && attemptsLeft > 0) {
        continue; // another registration just took this slug — retry with a fresh candidate
      }
      throw error;
    }
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Акаунт створено, але вхід не вдався. Спробуйте увійти вручну." };
    }
    throw error;
  }

  return {};
}
