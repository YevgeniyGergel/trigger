import { prisma } from "@/lib/prisma";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { NewSessionForm } from "./new-session-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const psychologist = await requireCurrentPsychologist();

  const [clients, services] = await Promise.all([
    prisma.client.findMany({
      where: { psychologistId: psychologist.id, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.serviceType.findMany({
      where: { psychologistId: psychologist.id, active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader eyebrow="Нова сесія" title="Створити сесію вручну" />

      <div className="mt-8 max-w-lg">
        {clients.length === 0 || services.length === 0 ? (
          <EmptyState
            title="Немає даних для створення сесії"
            description={
              clients.length === 0
                ? "Спершу додайте клієнта."
                : "Спершу додайте хоча б одну активну послугу на сторінці Розклад."
            }
          />
        ) : (
          <Card>
            <CardBody>
              <NewSessionForm
                clients={clients.map((c) => ({ id: c.id, name: c.name }))}
                services={services.map((s) => ({
                  id: s.id,
                  name: s.name,
                  slotMinutes: s.slotMinutes,
                  breakMinutes: s.breakMinutes,
                  priceCents: s.priceCents,
                  isDefault: s.isDefault,
                }))}
                defaultClientId={clientId}
              />
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
