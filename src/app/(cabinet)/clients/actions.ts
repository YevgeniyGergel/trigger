"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clientSchema } from "@/lib/validation/client";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";

export type ClientFormState = {
  error?: string;
};

export async function createClient(
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const psychologist = await requireCurrentPsychologist();

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некоректні дані" };
  }

  const { name, phone, email } = parsed.data;

  const client = await prisma.client.create({
    data: {
      psychologistId: psychologist.id,
      name,
      phone: phone || null,
      email: email || null,
    },
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function updateClient(
  clientId: string,
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const psychologist = await requireCurrentPsychologist();

  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некоректні дані" };
  }

  const { name, phone, email } = parsed.data;

  // Cross-account isolation and the write happen in one query: updateMany's
  // where clause structurally requires psychologistId to match, so there is
  // no way to write the row without the ownership check also passing.
  const result = await prisma.client.updateMany({
    where: { id: clientId, psychologistId: psychologist.id },
    data: { name, phone: phone || null, email: email || null },
  });

  if (result.count === 0) {
    return { error: "Клієнта не знайдено" };
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");

  return {};
}

export async function setClientActive(clientId: string, active: boolean): Promise<void> {
  const psychologist = await requireCurrentPsychologist();

  await prisma.client.updateMany({
    where: { id: clientId, psychologistId: psychologist.id },
    data: { active },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}
