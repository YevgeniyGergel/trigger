"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation/psychologist";
import { slugify } from "@/lib/slug";
import { signIn } from "@/lib/auth";

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

  const existing = await prisma.psychologist.findUnique({ where: { email } });
  if (existing) {
    return { error: "Психолог з таким email вже зареєстрований" };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const slug = await generateUniqueSlug(name);

  await prisma.psychologist.create({
    data: { name, email, passwordHash, slug },
  });

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard",
  });

  return {};
}
