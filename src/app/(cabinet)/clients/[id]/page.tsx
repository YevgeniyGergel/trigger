import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";
import { getOwnedClient } from "@/lib/owned-client";
import { ClientEditForm } from "./client-edit-form";
import { DeactivateButton } from "./deactivate-button";

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{client.name}</h1>
        <DeactivateButton clientId={client.id} active={client.active} />
      </div>

      <ClientEditForm
        clientId={client.id}
        defaultValues={{
          name: client.name,
          phone: client.phone ?? "",
          email: client.email ?? "",
        }}
      />

      <h2 className="mt-8 text-lg font-semibold">Історія сесій</h2>
      {sessions.length === 0 ? (
        <p className="mt-2 text-gray-600">Сесій поки немає.</p>
      ) : (
        <ul className="mt-2 divide-y rounded border bg-white">
          {sessions.map((session) => (
            <li key={session.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span>{session.startAt.toLocaleString("uk-UA")}</span>
                <span className="text-sm text-gray-500">
                  {session.status} · {session.paymentStatus}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
