import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { startOfWeek, addDays, toDateParam, parseDateParam } from "@/lib/week";

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
const STATUS_LABELS: Record<string, string> = {
  PENDING: "очікує",
  CONFIRMED: "підтверджено",
  CANCELLED: "скасовано",
  COMPLETED: "завершено",
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Сесії</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href={`/sessions?week=${prevWeek}`} className="rounded border px-3 py-1">
            ← Попередній тиждень
          </Link>
          <span>
            {weekStart.toLocaleDateString("uk-UA")} — {addDays(weekStart, 6).toLocaleDateString("uk-UA")}
          </span>
          <Link href={`/sessions?week=${nextWeek}`} className="rounded border px-3 py-1">
            Наступний тиждень →
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-7">
        {days.map((day, i) => {
          const daySessions = sessions.filter(
            (s) => s.startAt >= day && s.startAt < addDays(day, 1)
          );
          return (
            <div key={i} className="rounded border bg-white p-3">
              <div className="text-sm font-semibold">
                {DAY_LABELS[i]} {day.getDate()}.{day.getMonth() + 1}
              </div>
              {daySessions.length === 0 ? (
                <p className="mt-2 text-xs text-gray-400">—</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {daySessions.map((s) => (
                    <li key={s.id} className="rounded bg-gray-50 p-2 text-xs">
                      <div className="font-medium">
                        {s.startAt.toLocaleTimeString("uk-UA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div>{s.client.name}</div>
                      <div className="text-gray-500">
                        {STATUS_LABELS[s.status] ?? s.status}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
