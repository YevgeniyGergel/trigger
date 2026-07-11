import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { startOfWeek, addDays, toDateParam, parseDateParam } from "@/lib/week";
import { getZonedParts, formatKyiv } from "@/lib/timezone";
import { SessionActions } from "./session-actions";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";

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

function FilterTabs({
  active,
  pendingCount,
}: {
  active: "week" | "pending";
  pendingCount: number;
}) {
  const tabs = [
    { key: "week" as const, label: "Тиждень", href: "/sessions" },
    {
      key: "pending" as const,
      label: `Очікують підтвердження${pendingCount > 0 ? ` · ${pendingCount}` : ""}`,
      href: "/sessions?status=pending",
    },
  ];
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={active === tab.key ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            active === tab.key
              ? "bg-sage-600 text-white shadow-soft"
              : "border border-line bg-surface text-ink-muted hover:bg-sand-100 hover:text-ink"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; status?: string }>;
}) {
  const { week, status } = await searchParams;
  const psychologist = await requireCurrentPsychologist();
  const showPending = status === "pending";

  const weekStart = startOfWeek(parseDateParam(week));
  const weekEnd = addDays(weekStart, 7);
  const prevWeek = toDateParam(addDays(weekStart, -7));
  const nextWeek = toDateParam(addDays(weekStart, 7));

  const [sessions, pendingSessions] = await Promise.all([
    showPending
      ? Promise.resolve([])
      : prisma.session.findMany({
          where: {
            psychologistId: psychologist.id,
            startAt: { gte: weekStart, lt: weekEnd },
          },
          orderBy: { startAt: "asc" },
          include: { client: true, serviceType: true },
        }),
    prisma.session.findMany({
      where: { psychologistId: psychologist.id, status: "PENDING" },
      orderBy: { startAt: "asc" },
      include: { client: true, serviceType: true },
    }),
  ]);

  if (showPending) {
    return (
      <div>
        <PageHeader
          eyebrow="Потребують уваги"
          title="Сесії"
          description="Усі запити на сесії, які ще не підтверджено, — незалежно від тижня."
          actions={<ButtonLink href="/sessions/new">Нова сесія</ButtonLink>}
        />
        <FilterTabs active="pending" pendingCount={pendingSessions.length} />

        {pendingSessions.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Немає непідтверджених сесій"
              description="Коли клієнт запишеться на сесію, вона з'явиться тут для підтвердження."
            />
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {pendingSessions.map((s) => (
              <li key={s.id}>
                <Card>
                  <CardBody className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="font-display text-lg font-medium text-ink">
                          {formatKyiv(s.startAt, {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                          , {formatKyiv(s.startAt, { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="font-medium text-ink">{s.client.name}</span>
                        {s.serviceType ? (
                          <span className="text-sm text-ink-muted">{s.serviceType.name}</span>
                        ) : null}
                      </div>
                      <Badge tone="warning">очікує підтвердження</Badge>
                    </div>
                    <div className="mt-1 max-w-md text-xs">
                      <SessionActions
                        sessionId={s.id}
                        status={s.status}
                        startAt={s.startAt.toISOString()}
                        priceCents={s.priceCents}
                        paymentStatus={s.paymentStatus}
                        defaultOpen
                      />
                    </div>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayParts = getZonedParts(new Date());
  const isToday = (day: Date) => {
    const parts = getZonedParts(day);
    return (
      parts.year === todayParts.year &&
      parts.month === todayParts.month &&
      parts.day === todayParts.day
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow="Тиждень за тижнем"
        title="Сесії"
        actions={
          <div className="flex items-center gap-2">
            <ButtonLink href="/sessions/new" size="sm">
              Нова сесія
            </ButtonLink>
            <Link
              href={`/sessions?week=${prevWeek}`}
              aria-label="Попередній тиждень"
              className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink-muted shadow-soft transition-colors hover:bg-sand-100 hover:text-ink"
            >
              ←
            </Link>
            <span className="min-w-44 text-center text-sm font-medium text-ink">
              {formatKyiv(weekStart, { year: "numeric", month: "2-digit", day: "2-digit" })} —{" "}
              {formatKyiv(addDays(weekStart, 6), { year: "numeric", month: "2-digit", day: "2-digit" })}
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
      <FilterTabs active="week" pendingCount={pendingSessions.length} />

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
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
                  {String(getZonedParts(day).day).padStart(2, "0")}.
                  {String(getZonedParts(day).month).padStart(2, "0")}
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
                      const sessionStatus = STATUS_BADGES[s.status];
                      return (
                        <li
                          key={s.id}
                          className="min-w-0 rounded-xl bg-sand-100/70 p-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-sm font-medium text-ink">
                              {formatKyiv(s.startAt, { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <Badge tone={sessionStatus?.tone ?? "neutral"}>
                              {sessionStatus?.label ?? s.status}
                            </Badge>
                          </div>
                          <div className="mt-1 truncate font-medium text-ink">
                            {s.client.name}
                          </div>
                          {s.serviceType ? (
                            <div className="truncate text-ink-faint">{s.serviceType.name}</div>
                          ) : null}
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
