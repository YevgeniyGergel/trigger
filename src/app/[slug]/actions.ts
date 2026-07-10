"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bookingSchema } from "@/lib/validation/booking";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkSlotConflict } from "@/lib/slot-conflict";
import {
  notifyPsychologist,
  notifyClient,
  bookingConfirmationForPsychologist,
  bookingConfirmationForClient,
} from "@/lib/notifications";

export type BookingFormState = {
  error?: string;
  success?: boolean;
};

const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

class SlotTakenError extends Error {}

export async function createBooking(
  slug: string,
  _prevState: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const psychologist = await prisma.psychologist.findUnique({ where: { slug } });
  if (!psychologist) {
    return { error: "Психолога не знайдено" };
  }

  const parsed = bookingSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    startAt: formData.get("startAt"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некоректні дані" };
  }

  const { name, phone, email, startAt: startAtRaw } = parsed.data;
  const startAt = new Date(startAtRaw);
  if (Number.isNaN(startAt.getTime()) || startAt < new Date()) {
    return { error: "Обраний час більше недоступний. Оберіть інший слот." };
  }
  const endAt = new Date(startAt.getTime() + psychologist.sessionDurationMinutes * 60_000);

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const contactKey = (email || phone || "").toLowerCase();

  const ipAllowed = checkRateLimit(`booking:ip:${ip}`, RATE_LIMIT_MAX_ATTEMPTS, RATE_LIMIT_WINDOW_MS);
  const contactAllowed = checkRateLimit(
    `booking:contact:${contactKey}`,
    RATE_LIMIT_MAX_ATTEMPTS,
    RATE_LIMIT_WINDOW_MS
  );
  if (!ipAllowed || !contactAllowed) {
    return { error: "Забагато спроб бронювання. Спробуйте пізніше." };
  }

  let booking;
  try {
    booking = await prisma.$transaction(
      async (tx) => {
        const conflict = await checkSlotConflict(tx, {
          psychologistId: psychologist.id,
          startAt,
          endAt,
        });
        if (conflict) {
          throw new SlotTakenError();
        }

        const clientMatch: Prisma.ClientWhereInput[] = [];
        if (email) clientMatch.push({ email });
        if (phone) clientMatch.push({ phone });

        let client = clientMatch.length
          ? await tx.client.findFirst({
              where: { psychologistId: psychologist.id, OR: clientMatch },
            })
          : null;

        if (!client) {
          client = await tx.client.create({
            data: {
              psychologistId: psychologist.id,
              name,
              phone: phone || null,
              email: email || null,
            },
          });
        }

        const session = await tx.session.create({
          data: {
            psychologistId: psychologist.id,
            clientId: client.id,
            startAt,
            endAt,
            status: "PENDING",
            priceCents: psychologist.defaultSessionPriceCents ?? null,
          },
        });

        return { client, session };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (error instanceof SlotTakenError) {
      return { error: "Цей час щойно зайняли. Оберіть інший слот." };
    }
    // Serializable isolation makes Postgres abort one side of a concurrent
    // double-booking with a write-conflict error instead of silently
    // committing both — surface it the same way as an explicit conflict.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { error: "Цей час щойно зайняли. Оберіть інший слот." };
    }
    throw error;
  }

  try {
    await notifyPsychologist(
      psychologist,
      "BOOKING_CONFIRMATION",
      bookingConfirmationForPsychologist(booking.client.name, startAt),
      booking.session.id
    );
    await notifyClient(
      booking.client,
      "BOOKING_CONFIRMATION",
      bookingConfirmationForClient(startAt),
      booking.session.id
    );
  } catch (error) {
    console.error("[booking] notification dispatch failed:", error);
  }

  revalidatePath(`/${slug}`);
  return { success: true };
}
