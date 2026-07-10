import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { getOwnedClient } from "@/lib/owned-client";
import { ClientEditForm } from "./client-edit-form";
import { DeactivateButton } from "./deactivate-button";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_BADGES: Record<
  string,
  { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" | "sage" }
> = {
  PENDING: { label: "очікує", tone: "warning" },
  CONFIRMED: { label: "підтверджено", tone: "sage" },
  CANCELLED: { label: "скасовано", tone: "danger" },
  COMPLETED: { label: "завершено", tone: "success" },
};

const PAYMENT_BADGES: Record<
  string,
  { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" | "sage" }
> = {
  NONE: { label: "без оплати", tone: "neutral" },
  PENDING: { label: "очікує оплати", tone: "warning" },
  PAID: { label: "оплачено", tone: "success" },
  FAILED: { label: "оплата не вдалась", tone: "danger" },
  REFUNDED: { label: "повернено", tone: "info" },
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const psychologist = await requireCurrentPsychologist();

  // Both queries are independent of each other (sessions are keyed off the
  // URL id directly); running them concurrently avoids a serial round-trip.
  // Sessions are only ever rendered after the ownership check below passes.
  const [client, sessions] = await Promise.all([
    getOwnedClient(psychologist.id, id),
    prisma.session.findMany({
      where: { clientId: id },
      orderBy: { startAt: "desc" },
      include: { note: true, payments: true },
    }),
  ]);

  if (!client) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Клієнт"
        title={client.name}
        actions={<DeactivateButton clientId={client.id} active={client.active} />}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <ClientEditForm
          clientId={client.id}
          defaultValues={{
            name: client.name,
            phone: client.phone ?? "",
            email: client.email ?? "",
          }}
        />

        <section>
          <SectionTitle>Історія сесій</SectionTitle>
          {sessions.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="Сесій поки немає"
                description="Коли клієнт запишеться або ви створите сесію, вона з'явиться тут."
              />
            </div>
          ) : (
            <Card className="mt-4 divide-y divide-line overflow-hidden">
              {sessions.map((session) => {
                const status = STATUS_BADGES[session.status];
                const payment = PAYMENT_BADGES[session.paymentStatus];
                return (
                  <div
                    key={session.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5"
                  >
                    <span className="text-sm text-ink">
                      {session.startAt.toLocaleString("uk-UA", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Badge tone={status?.tone ?? "neutral"}>
                        {status?.label ?? session.status}
                      </Badge>
                      <Badge tone={payment?.tone ?? "neutral"}>
                        {payment?.label ?? session.paymentStatus}
                      </Badge>
                    </span>
                  </div>
                );
              })}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
