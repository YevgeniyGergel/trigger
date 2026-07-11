import { prisma } from "@/lib/prisma";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { WorkingHoursForm } from "./working-hours-form";
import { BlockedRangeForm } from "./blocked-range-form";
import { BlockedRangeList } from "./blocked-range-list";
import { ServiceForm } from "./service-form";
import { ServiceList } from "./service-list";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";

export default async function SchedulePage() {
  const psychologist = await requireCurrentPsychologist();

  const [workingHours, blockedRanges, services] = await Promise.all([
    prisma.workingHour.findMany({
      where: { psychologistId: psychologist.id },
      orderBy: { weekday: "asc" },
    }),
    prisma.blockedRange.findMany({
      where: { psychologistId: psychologist.id, endAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
    }),
    prisma.serviceType.findMany({
      where: { psychologistId: psychologist.id },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { sessions: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Ритм тижня"
        title="Розклад"
        description="Робочі години визначають, коли клієнти бачать вільні слоти для запису."
      />

      <section className="mt-8">
        <SectionTitle>Послуги</SectionTitle>
        <Card className="mt-4">
          <CardBody>
            <ServiceForm />
          </CardBody>
        </Card>
        <ServiceList services={services} />
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle>Робочі години</SectionTitle>
          <Card className="mt-4">
            <CardBody>
              {/* Keyed on the fetched data so a successful save (which revalidates
                  this server component but keeps WorkingHoursForm mounted) forces
                  a remount — otherwise the form's uncontrolled defaultChecked/
                  defaultValue inputs would keep showing stale pre-save values,
                  since React only applies those on initial mount. */}
              <WorkingHoursForm
                key={JSON.stringify(workingHours.map((r) => [r.weekday, r.startTime, r.endTime]))}
                initialRules={workingHours}
              />
            </CardBody>
          </Card>
        </section>

        <section>
          <SectionTitle>Заблоковані періоди</SectionTitle>
          <Card className="mt-4">
            <CardBody>
              <BlockedRangeForm />
            </CardBody>
          </Card>
          <BlockedRangeList ranges={blockedRanges} />
        </section>
      </div>
    </div>
  );
}
