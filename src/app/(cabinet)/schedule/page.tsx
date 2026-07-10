import { prisma } from "@/lib/prisma";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { WorkingHoursForm } from "./working-hours-form";
import { BlockedRangeForm } from "./blocked-range-form";
import { BlockedRangeList } from "./blocked-range-list";

export default async function SchedulePage() {
  const psychologist = await requireCurrentPsychologist();

  const [workingHours, blockedRanges] = await Promise.all([
    prisma.workingHour.findMany({
      where: { psychologistId: psychologist.id },
      orderBy: { weekday: "asc" },
    }),
    prisma.blockedRange.findMany({
      where: { psychologistId: psychologist.id, endAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Розклад</h1>

      <section>
        <h2 className="mt-6 text-lg font-semibold">Робочі години</h2>
        {/* Keyed on the fetched data so a successful save (which revalidates
            this server component but keeps WorkingHoursForm mounted) forces
            a remount — otherwise the form's uncontrolled defaultChecked/
            defaultValue inputs would keep showing stale pre-save values,
            since React only applies those on initial mount. */}
        <WorkingHoursForm
          key={JSON.stringify(workingHours.map((r) => [r.weekday, r.startTime, r.endTime]))}
          initialRules={workingHours}
        />
      </section>

      <section>
        <h2 className="mt-8 text-lg font-semibold">Заблоковані періоди</h2>
        <BlockedRangeForm />
        <BlockedRangeList ranges={blockedRanges} />
      </section>
    </div>
  );
}
