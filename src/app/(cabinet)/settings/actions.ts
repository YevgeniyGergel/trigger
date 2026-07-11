"use server";

import { revalidatePath } from "next/cache";
import type { IntegrationProvider, MeetingProviderType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema, noteLanguageSchema } from "@/lib/validation/psychologist";
import { liqpayCredentialsSchema } from "@/lib/validation/liqpay";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { isUniqueConstraintError } from "@/lib/prisma-errors";
import { encryptSecret } from "@/lib/crypto";
import { buildTelegramLinkUrl } from "@/lib/telegram";
import { randomUUID } from "node:crypto";
import { getConnection, deleteConnection } from "@/lib/integrations/connections";
import { OAUTH_PROVIDERS } from "@/lib/integrations/oauth-config";

export type ProfileFormState = {
  error?: string;
  success?: boolean;
};

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const psychologist = await requireCurrentPsychologist();

  const parsed = profileUpdateSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некоректні дані" };
  }

  const { name, slug, description } = parsed.data;

  try {
    await prisma.psychologist.update({
      where: { id: psychologist.id },
      data: {
        name,
        slug,
        description: description || null,
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

export type NoteLanguageState = {
  error?: string;
  success?: boolean;
};

export async function updateNoteLanguage(
  _prevState: NoteLanguageState,
  formData: FormData
): Promise<NoteLanguageState> {
  const psychologist = await requireCurrentPsychologist();

  const parsed = noteLanguageSchema.safeParse({
    noteLanguage: formData.get("noteLanguage"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некоректні дані" };
  }

  await prisma.psychologist.update({
    where: { id: psychologist.id },
    data: { noteLanguage: parsed.data.noteLanguage },
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

// The meeting provider that rides on each integration provider's
// connection — used to know which defaultMeetingProvider values must reset
// to NONE when that connection is removed. Google Meet has no connection of
// its own (design.md meeting-links "Disconnecting Google Calendar while
// Meet is default").
const RIDES_ON: Record<IntegrationProvider, MeetingProviderType> = {
  GOOGLE: "GOOGLE_MEET",
  ZOOM: "ZOOM",
};

export async function disconnectIntegration(provider: IntegrationProvider): Promise<void> {
  const psychologist = await requireCurrentPsychologist();

  const connection = await getConnection(psychologist.id, provider);
  if (connection) {
    try {
      const config = OAUTH_PROVIDERS[provider];
      await fetch(config.revokeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: connection.accessToken }),
        signal: AbortSignal.timeout(5_000),
      });
    } catch (error) {
      console.error(`[settings] best-effort ${provider} token revocation failed:`, error);
    }
  }

  await deleteConnection(psychologist.id, provider);

  if (psychologist.defaultMeetingProvider === RIDES_ON[provider]) {
    await prisma.psychologist.update({
      where: { id: psychologist.id },
      data: { defaultMeetingProvider: "NONE" },
    });
  }

  revalidatePath("/settings");
}

export type MeetingProviderFormState = {
  error?: string;
  success?: boolean;
};

export async function updateDefaultMeetingProvider(
  _prevState: MeetingProviderFormState,
  formData: FormData
): Promise<MeetingProviderFormState> {
  const psychologist = await requireCurrentPsychologist();

  const value = String(formData.get("defaultMeetingProvider") ?? "NONE") as MeetingProviderType;
  if (!["NONE", "GOOGLE_MEET", "ZOOM"].includes(value)) {
    return { error: "Некоректний провайдер" };
  }

  if (value !== "NONE") {
    const requiredProvider: IntegrationProvider = value === "GOOGLE_MEET" ? "GOOGLE" : "ZOOM";
    const connection = await getConnection(psychologist.id, requiredProvider);
    if (!connection || connection.status !== "ACTIVE") {
      return { error: "Спершу підключіть відповідний сервіс" };
    }
  }

  await prisma.psychologist.update({
    where: { id: psychologist.id },
    data: { defaultMeetingProvider: value },
  });

  revalidatePath("/settings");

  return { success: true };
}
