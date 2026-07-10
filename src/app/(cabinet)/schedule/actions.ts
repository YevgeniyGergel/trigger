"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { workingHoursSchema, blockedRangeSchema } from "@/lib/validation/schedule";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export type WorkingHoursFormState = {
  error?: string;
  success?: boolean;
};

export async function saveWorkingHours(
  _prevState: WorkingHoursFormState,
  formData: FormData
): Promise<WorkingHoursFormState> {
  const psychologist = await requireCurrentPsychologist();

  const rules = WEEKDAYS.filter((weekday) => formData.get(`enabled_${weekday}`) === "on").map(
    (weekday) => ({
      weekday,
      startTime: String(formData.get(`start_${weekday}`) ?? ""),
      endTime: String(formData.get(`end_${weekday}`) ?? ""),
    })
  );

  const parsed = workingHoursSchema.safeParse(rules);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некоректні дані" };
  }

  await prisma.$transaction([
    prisma.workingHour.deleteMany({ where: { psychologistId: psychologist.id } }),
    prisma.workingHour.createMany({
      data: parsed.data.map((rule) => ({ ...rule, psychologistId: psychologist.id })),
    }),
  ]);

  revalidatePath("/schedule");

  return { success: true };
}

export type BlockedRangeFormState = {
  error?: string;
  conflictWarning?: string;
  // The exact startAt/endAt the warning was issued for — the client echoes
  // these back as hidden fields on the confirm submission, and the server
  // only honors `confirmed` if they still match the current submission.
  // Without this, editing the dates after seeing a warning and then
  // clicking confirm would silently skip the conflict check for the new,
  // never-warned-about range.
  confirmedFor?: { startAt: string; endAt: string };
};

export async function addBlockedRange(
  _prevState: BlockedRangeFormState,
  formData: FormData
): Promise<BlockedRangeFormState> {
  const psychologist = await requireCurrentPsychologist();

  const parsed = blockedRangeSchema.safeParse({
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некоректні дані" };
  }

  const startAt = new Date(parsed.data.startAt);
  const endAt = new Date(parsed.data.endAt);

  const confirmedForStart = formData.get("confirmedForStart");
  const confirmedForEnd = formData.get("confirmedForEnd");
  const confirmed =
    confirmedForStart === parsed.data.startAt && confirmedForEnd === parsed.data.endAt;

  const conflictingSessions = await prisma.session.findMany({
    where: {
      psychologistId: psychologist.id,
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { client: { select: { name: true } } },
  });

  if (conflictingSessions.length > 0 && !confirmed) {
    const names = conflictingSessions.map((s) => s.client.name).join(", ");
    return {
      conflictWarning: `У цей період вже є сесії з: ${names}. Натисніть "Блокувати попри це", щоб продовжити.`,
      confirmedFor: { startAt: parsed.data.startAt, endAt: parsed.data.endAt },
    };
  }

  await prisma.blockedRange.create({
    data: {
      psychologistId: psychologist.id,
      startAt,
      endAt,
      reason: parsed.data.reason || null,
    },
  });

  revalidatePath("/schedule");

  return {};
}

export async function removeBlockedRange(rangeId: string): Promise<void> {
  const psychologist = await requireCurrentPsychologist();

  await prisma.blockedRange.deleteMany({
    where: { id: rangeId, psychologistId: psychologist.id },
  });

  revalidatePath("/schedule");
}
