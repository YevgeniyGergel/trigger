import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { startOfWeek, addDays, toDateParam, parseDateParam } from "@/lib/week";
import { SessionActions } from "./session-actions";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

const STATUS_BADGES: Record<
  string,
  { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" | "sage" }
> = {
  PENDING: { label: "очікує", tone: "warning" },
  CONFIRMED: { label: "підтверджено", tone: "sage" },
  CANCELLED: { label: "скасовано", tone: "danger" },
  COMPLETED: { label: "завершено", tone: "success" },
};

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const psychologist = await requireCurrentPsychologist();

  const weekStart = startOfWeek(parseDateParam(week));
  const weekEnd = addDays(weekStart, 7);
  const prevWeek = toDateParam(addDays(weekStart, -7));
  const nextWeek = toDateParam(addDays(weekStart, 7));

  const sessions = await prisma.session.findMany({
    where: {
      psychologistId: psychologist.id,
      startAt: { gte: weekStart, lt: weekEnd },
    },
    orderBy: { startAt: "asc" },
    include: { client: true },
  });

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const isToday = (day: Date) =>
    day.getFullYear() === today.getFullYear() &&
    day.getMonth() === today.getMonth() &&
    day.getDate() === today.getDate();

  return (
    <div>
      <PageHeader
        eyebrow="Тиждень за тижнем"
        title="Сесії"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/sessions?week=${prevWeek}`}
              aria-label="Попередній тиждень"
              className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink-muted shadow-soft transition-colors hover:bg-sand-100 hover:text-ink"
            >
              ←
            </Link>
            <span className="min-w-44 text-center text-sm font-medium text-ink">
              {weekStart.toLocaleDateString("uk-UA")} —{" "}
              {addDays(weekStart, 6).toLocaleDateString("uk-UA")}
            </span>
            <Link
              href={`/sessions?week=${nextWeek}`}
              aria-label="Наступний тиждень"
              className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink-muted shadow-soft transition-colors hover:bg-sand-100 hover:text-ink"
            >
              →
            </Link>
          </div>
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
        {days.map((day, i) => {
          const daySessions = sessions.filter(
            (s) => s.startAt >= day && s.startAt < addDays(day, 1)
          );
          const current = isToday(day);
          return (
            <Card
              key={i}
              className={
                current ? "border-sage-300 bg-sage-50/60" : undefined
              }
            >
              <div className="flex items-baseline justify-between border-b border-line px-3 py-2.5">
                <span
                  className={`text-xs font-semibold uppercase tracking-[0.14em] ${
                    current ? "text-sage-700" : "text-ink-muted"
                  }`}
                >
                  {DAY_LABELS[i]}
                </span>
                <span className="font-display text-sm text-ink">
                  {day.getDate()}.{String(day.getMonth() + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="p-3">
                {daySessions.length === 0 ? (
                  <p className="py-3 text-center text-xs text-ink-faint">
                    вільно
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {daySessions.map((s) => {
                      const status = STATUS_BADGES[s.status];
                      return (
                        <li
                          key={s.id}
                          className="rounded-xl bg-sand-100/70 p-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-sm font-medium text-ink">
                              {s.startAt.toLocaleTimeString("uk-UA", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <Badge tone={status?.tone ?? "neutral"}>
                              {status?.label ?? s.status}
                            </Badge>
                          </div>
                          <div className="mt-1 font-medium text-ink">
                            {s.client.name}
                          </div>
                          <SessionActions
                            sessionId={s.id}
                            status={s.status}
                            startAt={s.startAt.toISOString()}
                            priceCents={s.priceCents}
                            paymentStatus={s.paymentStatus}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
