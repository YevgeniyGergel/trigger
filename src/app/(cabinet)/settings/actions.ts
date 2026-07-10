"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validation/psychologist";
import { liqpayCredentialsSchema } from "@/lib/validation/liqpay";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { isUniqueConstraintError } from "@/lib/prisma-errors";
import { encryptSecret } from "@/lib/crypto";
import { buildTelegramLinkUrl } from "@/lib/telegram";
import { randomUUID } from "node:crypto";

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

export type NotificationPrefsState = {
  error?: string;
  success?: boolean;
};

export async function updateNotificationPreferences(
  _prevState: NotificationPrefsState,
  formData: FormData
): Promise<NotificationPrefsState> {
  const psychologist = await requireCurrentPsychologist();

  await prisma.psychologist.update({
    where: { id: psychologist.id },
    data: {
      emailNotificationsEnabled: formData.get("emailNotificationsEnabled") === "on",
      telegramNotificationsEnabled: formData.get("telegramNotificationsEnabled") === "on",
    },
  });

  revalidatePath("/settings");

  return { success: true };
}

export type TelegramLinkState = {
  error?: string;
  linkUrl?: string;
};

export async function generateTelegramLink(): Promise<TelegramLinkState> {
  const psychologist = await requireCurrentPsychologist();

  const token = randomUUID();
  await prisma.psychologist.update({
    where: { id: psychologist.id },
    data: { telegramLinkToken: token },
  });

  let linkUrl: string;
  try {
    linkUrl = buildTelegramLinkUrl(token);
  } catch {
    return { error: "Telegram-бот не налаштований" };
  }

  revalidatePath("/settings");

  return { linkUrl };
}

export type LiqpayFormState = {
  error?: string;
  success?: boolean;
};

export async function updateLiqpayCredentials(
  _prevState: LiqpayFormState,
  formData: FormData
): Promise<LiqpayFormState> {
  const psychologist = await requireCurrentPsychologist();

  const parsed = liqpayCredentialsSchema.safeParse({
    publicKey: formData.get("publicKey"),
    privateKey: formData.get("privateKey"),
    mode: formData.get("mode"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некоректні дані" };
  }

  const { publicKey, privateKey, mode } = parsed.data;

  // The private key input is left blank on re-save when the psychologist
  // isn't rotating it — only overwrite liqpayPrivateKeyEnc when a new value
  // was actually submitted, so the encrypted key already on file survives.
  if (!privateKey && !psychologist.liqpayPrivateKeyEnc) {
    return { error: "Вкажіть private key" };
  }

  let liqpayPrivateKeyEnc: string | undefined;
  if (privateKey) {
    try {
      liqpayPrivateKeyEnc = encryptSecret(privateKey);
    } catch (error) {
      console.error("[settings] failed to encrypt LiqPay private key:", error);
      return { error: "Не вдалося зберегти ключ. Спробуйте пізніше." };
    }
  }

  await prisma.psychologist.update({
    where: { id: psychologist.id },
    data: {
      liqpayPublicKey: publicKey,
      liqpayMode: mode,
      ...(liqpayPrivateKeyEnc ? { liqpayPrivateKeyEnc } : {}),
    },
  });

  revalidatePath("/settings");

  return { success: true };
}
