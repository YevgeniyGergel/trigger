"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serviceTypeSchema, type ServiceTypeInput } from "@/lib/validation/service-type";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";

export type ServiceTypeFormState = {
  error?: string;
  success?: boolean;
};

type ParsedServiceTypeForm =
  | { ok: true; data: ServiceTypeInput }
  | { ok: false; error: string };

function parseServiceTypeForm(formData: FormData): ParsedServiceTypeForm {
  const priceRaw = formData.get("priceUah");
  const priceRawTrimmed = typeof priceRaw === "string" ? priceRaw.trim() : "";
  const priceUah = priceRawTrimmed !== "" ? Number(priceRawTrimmed) : null;

  if (priceUah !== null && Number.isNaN(priceUah)) {
    return { ok: false, error: "Вартість має бути числом" };
  }

  const parsed = serviceTypeSchema.safeParse({
    name: formData.get("name"),
    slotMinutes: Number(formData.get("slotMinutes")),
    breakMinutes: Number(formData.get("breakMinutes") || 0),
    priceCents: priceUah !== null ? Math.round(priceUah * 100) : null,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Некоректні дані" };
  }

  return { ok: true, data: parsed.data };
}

export async function createServiceType(
  _prevState: ServiceTypeFormState,
  formData: FormData
): Promise<ServiceTypeFormState> {
  const psychologist = await requireCurrentPsychologist();

  const parsed = parseServiceTypeForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const existingCount = await prisma.serviceType.count({
    where: { psychologistId: psychologist.id },
  });

  await prisma.serviceType.create({
    data: {
      ...parsed.data,
      psychologistId: psychologist.id,
      // The very first service a psychologist creates becomes their default
      // automatically — otherwise nothing would be preselected in booking.
      isDefault: existingCount === 0,
      sortOrder: existingCount,
    },
  });

  revalidatePath("/schedule");

  return { success: true };
}

export async function updateServiceType(
  serviceTypeId: string,
  _prevState: ServiceTypeFormState,
  formData: FormData
): Promise<ServiceTypeFormState> {
  const psychologist = await requireCurrentPsychologist();

  const parsed = parseServiceTypeForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  const result = await prisma.serviceType.updateMany({
    where: { id: serviceTypeId, psychologistId: psychologist.id },
    data: parsed.data,
  });

  if (result.count === 0) {
    return { error: "Послугу не знайдено" };
  }

  revalidatePath("/schedule");

  return { success: true };
}

export type SimpleActionResult = { error?: string };

export async function setServiceTypeActive(
  serviceTypeId: string,
  active: boolean
): Promise<SimpleActionResult> {
  const psychologist = await requireCurrentPsychologist();

  const service = await prisma.serviceType.findFirst({
    where: { id: serviceTypeId, psychologistId: psychologist.id },
  });
  if (!service) {
    return { error: "Послугу не знайдено" };
  }
  if (!active && service.isDefault) {
    return { error: "Спершу оберіть іншу послугу за замовчуванням" };
  }

  await prisma.serviceType.update({
    where: { id: serviceTypeId },
    data: { active },
  });

  revalidatePath("/schedule");

  return {};
}

export async function setDefaultServiceType(serviceTypeId: string): Promise<SimpleActionResult> {
  const psychologist = await requireCurrentPsychologist();

  const service = await prisma.serviceType.findFirst({
    where: { id: serviceTypeId, psychologistId: psychologist.id },
  });
  if (!service) {
    return { error: "Послугу не знайдено" };
  }
  if (!service.active) {
    return { error: "Неактивну послугу не можна зробити типовою" };
  }

  await prisma.$transaction([
    prisma.serviceType.updateMany({
      where: { psychologistId: psychologist.id, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.serviceType.update({
      where: { id: serviceTypeId },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath("/schedule");

  return {};
}

export async function deleteServiceType(serviceTypeId: string): Promise<SimpleActionResult> {
  const psychologist = await requireCurrentPsychologist();

  const service = await prisma.serviceType.findFirst({
    where: { id: serviceTypeId, psychologistId: psychologist.id },
    include: { _count: { select: { sessions: true } } },
  });
  if (!service) {
    return { error: "Послугу не знайдено" };
  }
  if (service.isDefault) {
    return { error: "Типову послугу не можна видалити — спершу оберіть іншу типову" };
  }
  if (service._count.sessions > 0) {
    return { error: "Послугу з сесіями не можна видалити — деактивуйте її" };
  }

  await prisma.serviceType.delete({ where: { id: serviceTypeId } });

  revalidatePath("/schedule");

  return {};
}

export async function moveServiceType(
  serviceTypeId: string,
  direction: "up" | "down"
): Promise<SimpleActionResult> {
  const psychologist = await requireCurrentPsychologist();

  const services = await prisma.serviceType.findMany({
    where: { psychologistId: psychologist.id },
    orderBy: { sortOrder: "asc" },
  });

  const index = services.findIndex((s) => s.id === serviceTypeId);
  if (index === -1) {
    return { error: "Послугу не знайдено" };
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= services.length) {
    return {};
  }

  const current = services[index];
  const swapWith = services[swapIndex];

  await prisma.$transaction([
    prisma.serviceType.update({
      where: { id: current.id },
      data: { sortOrder: swapWith.sortOrder },
    }),
    prisma.serviceType.update({
      where: { id: swapWith.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);

  revalidatePath("/schedule");

  return {};
}
