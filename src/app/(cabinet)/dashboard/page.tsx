import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { startOfWeek, addDays } from "@/lib/week";
import { Card, CardBody } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/page-header";
import { RippleMark } from "@/components/ui/ripple";

export default async function DashboardPage() {
  const psychologist = await requireCurrentPsychologist();

  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 7);

  const [activeClients, weekSessions, pendingSessions] = await Promise.all([
    prisma.client.count({
      where: { psychologistId: psychologist.id, active: true },
    }),
    prisma.session.count({
      where: {
        psychologistId: psychologist.id,
        startAt: { gte: weekStart, lt: weekEnd },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    }),
    prisma.session.count({
      where: { psychologistId: psychologist.id, status: "PENDING" },
    }),
  ]);

  const stats = [
    { label: "Активних клієнтів", value: activeClients, href: "/clients" },
    { label: "Сесій цього тижня", value: weekSessions, href: "/sessions" },
    { label: "Очікують підтвердження", value: pendingSessions, href: "/sessions" },
  ];

  return (
    <div>
      <div className="relative overflow-hidden rounded-card border border-line bg-gradient-to-br from-sage-50 via-surface to-sand-100 px-8 py-10 shadow-soft">
        <RippleMark
          dot={false}
          strokeWidth={0.6}
          className="pointer-events-none absolute -top-24 -right-24 size-80 text-sage-300/50"
        />
        <Eyebrow>Ваш простір практики</Eyebrow>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink">
          Вітаємо, {psychologist.name}
        </h1>
        <p className="mt-2 max-w-lg text-sm text-ink-muted">
          Спокійний огляд вашої практики: клієнти, розклад і найближчі сесії —
          все під рукою.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group rounded-card">
            <Card className="transition-shadow group-hover:shadow-lifted">
              <CardBody>
                <p className="font-display text-4xl font-medium text-ink">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-sm text-ink-muted">{stat.label}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
