import { prisma } from "@/lib/prisma";

/**
 * Fetches a session only if it belongs to the given psychologist — the choke
 * point for cross-tenant isolation on Session records (and, by extension,
 * their notes/audio/transcripts). Mirrors getOwnedClient.
 */
export async function getOwnedSession(psychologistId: string, sessionId: string) {
  return prisma.session.findFirst({
    where: { id: sessionId, psychologistId },
    include: { client: true, note: true, serviceType: true },
  });
}
