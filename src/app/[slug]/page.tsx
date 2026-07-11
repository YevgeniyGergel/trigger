import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateAvailableSlots } from "@/lib/slots";
import { BookingForm } from "./booking-form";
import { Logo } from "@/components/ui/logo";
import { RippleBackdrop } from "@/components/ui/ripple";
import { Eyebrow } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

const BOOKING_WINDOW_DAYS = 14;

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const psychologist = await prisma.psychologist.findUnique({ where: { slug } });
  if (!psychologist) {
    notFound();
  }

  const fromDate = new Date();
  // Plain ms arithmetic (not setDate, which reads/writes local calendar
  // fields) — this is just a rough upper bound on the booking window, not a
  // Kyiv-calendar-exact boundary, so it doesn't need timezone conversion.
  const toDate = new Date(fromDate.getTime() + BOOKING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [workingHours, blockedRanges, bookedSessions] = await Promise.all([
    prisma.workingHour.findMany({ where: { psychologistId: psychologist.id } }),
    prisma.blockedRange.findMany({
      where: { psychologistId: psychologist.id, endAt: { gt: fromDate }, startAt: { lt: toDate } },
      select: { startAt: true, endAt: true },
    }),
    prisma.session.findMany({
      where: {
        psychologistId: psychologist.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        endAt: { gt: fromDate },
        startAt: { lt: toDate },
      },
      select: { startAt: true, endAt: true },
    }),
  ]);

  const slots = generateAvailableSlots({
    workingHours,
    sessionDurationMinutes: psychologist.sessionDurationMinutes,
    breakDurationMinutes: psychologist.breakDurationMinutes,
    blockedRanges,
    bookedRanges: bookedSessions,
    fromDate,
    toDate,
  });

  return (
    <div className="relative min-h-screen">
      <RippleBackdrop />
      <div className="relative mx-auto max-w-2xl px-6 py-12">
        <Logo href={null} />

        <div className="mt-12">
          <Eyebrow>Запис на сесію</Eyebrow>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
            {psychologist.name}
          </h1>
          {psychologist.description ? (
            <p className="mt-3 max-w-xl text-ink-muted">
              {psychologist.description}
            </p>
          ) : null}
        </div>

        <h2 className="mt-10 font-display text-xl font-medium tracking-tight text-ink">
          Оберіть зручний час
        </h2>

        {slots.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title="Наразі немає доступних слотів"
              description="Спробуйте перевірити пізніше — розклад оновлюється."
            />
          </div>
        ) : (
          <BookingForm
            slug={slug}
            slots={slots.map((s) => ({ startAt: s.startAt.toISOString(), endAt: s.endAt.toISOString() }))}
          />
        )}

        <p className="mt-16 text-center text-xs tracking-[0.18em] text-ink-faint uppercase">
          Trigger · Простір спокійної практики
        </p>
      </div>
    </div>
  );
}
