import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ClientsPage() {
  const psychologist = await requireCurrentPsychologist();

  const clients = await prisma.client.findMany({
    where: { psychologistId: psychologist.id, active: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Практика"
        title="Клієнти"
        description="Люди, з якими ви працюєте зараз."
        actions={<ButtonLink href="/clients/new">Додати клієнта</ButtonLink>}
      />

      {clients.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Клієнтів поки немає"
            description="Додайте першого клієнта, щоб вести сесії та нотатки."
            action={
              <ButtonLink href="/clients/new" variant="secondary">
                Додати клієнта
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <Card className="mt-8 divide-y divide-line overflow-hidden">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-sand-100/60"
            >
              <span className="flex items-center gap-3.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-sage-100 font-display text-sm font-medium text-sage-700">
                  {client.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="font-medium text-ink">{client.name}</span>
              </span>
              <span className="text-sm text-ink-muted">
                {client.phone || client.email}
              </span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
