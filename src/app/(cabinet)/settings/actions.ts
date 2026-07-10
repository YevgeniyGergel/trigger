"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validation/psychologist";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";

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
  const priceUah = typeof priceRaw === "string" && priceRaw.trim() !== "" ? Number(priceRaw) : null;

  const parsed = profileUpdateSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    defaultSessionPriceCents:
      priceUah !== null && !Number.isNaN(priceUah) ? Math.round(priceUah * 100) : null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некоректні дані" };
  }

  const { name, slug, description, defaultSessionPriceCents } = parsed.data;

  if (slug !== psychologist.slug) {
    const slugTaken = await prisma.psychologist.findUnique({ where: { slug } });
    if (slugTaken) {
      return { error: "Цей слаг вже зайнятий, оберіть інший" };
    }
  }

  await prisma.psychologist.update({
    where: { id: psychologist.id },
    data: {
      name,
      slug,
      description: description || null,
      defaultSessionPriceCents,
    },
  });

  revalidatePath("/settings");

  return { success: true };
}
