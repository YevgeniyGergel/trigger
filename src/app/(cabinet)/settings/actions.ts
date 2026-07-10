"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validation/psychologist";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { isUniqueConstraintError } from "@/lib/prisma-errors";

export type ProfileFormState = {
  error?: string;
  success?: boolean;
};

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const psychologist = await requireCurrentPsychologist();

  const priceRaw = formData.get("defaultSessionPrice");
  const priceRawTrimmed = typeof priceRaw === "string" ? priceRaw.trim() : "";
  const priceUah = priceRawTrimmed !== "" ? Number(priceRawTrimmed) : null;

  if (priceUah !== null && Number.isNaN(priceUah)) {
    return { error: "Вартість сесії має бути числом" };
  }

  const parsed = profileUpdateSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    defaultSessionPriceCents: priceUah !== null ? Math.round(priceUah * 100) : null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некоректні дані" };
  }

  const { name, slug, description, defaultSessionPriceCents } = parsed.data;

  try {
    await prisma.psychologist.update({
      where: { id: psychologist.id },
      data: {
        name,
        slug,
        description: description || null,
        defaultSessionPriceCents,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error, "slug")) {
      return { error: "Цей слаг вже зайнятий, оберіть інший" };
    }
    throw error;
  }

  revalidatePath("/settings");

  return { success: true };
}
