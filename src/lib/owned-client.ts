import { prisma } from "@/lib/prisma";

/**
 * Fetches a client only if it belongs to the given psychologist — the single
 * choke point for cross-tenant isolation on Client records. Every action or
 * page that reads/writes a client by id must go through this instead of
 * calling prisma.client.* directly, so a future resource type copying this
 * pattern has one obvious place to look.
 */
export async function getOwnedClient(psychologistId: string, clientId: string) {
  return prisma.client.findFirst({
    where: { id: clientId, psychologistId },
  });
}
