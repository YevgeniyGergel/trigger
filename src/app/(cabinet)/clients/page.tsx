import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentPsychologist } from "@/lib/current-psychologist";

export default async function ClientsPage() {
  const psychologist = await requireCurrentPsychologist();

  const clients = await prisma.client.findMany({
    where: { psychologistId: psychologist.id, active: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Клієнти</h1>
        <Link
          href="/clients/new"
          className="rounded bg-black px-4 py-2 text-sm text-white"
        >
          Додати клієнта
        </Link>
      </div>

      {clients.length === 0 ? (
        <p className="mt-6 text-gray-600">Клієнтів поки немає.</p>
      ) : (
        <ul className="mt-6 divide-y rounded border bg-white">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/clients/${client.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <span className="font-medium">{client.name}</span>
                <span className="text-sm text-gray-500">
                  {client.phone || client.email}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
