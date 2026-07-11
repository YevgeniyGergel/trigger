import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { retrySessionSync } from "@/lib/integrations/session-sync";

/**
 * Reconciles sessions whose calendar/meeting sync failed inline (syncPending
 * = true), giving the at-least-once semantics design.md D4 relies on
 * instead of a proper job queue.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.session.findMany({
    where: { syncPending: true },
    select: { id: true },
  });

  let reconciled = 0;
  for (const session of sessions) {
    try {
      await retrySessionSync(session.id);
      reconciled += 1;
    } catch (error) {
      console.error(`[cron sync-reconcile] failed for session ${session.id}:`, error);
    }
  }

  return NextResponse.json({ ok: true, attempted: sessions.length, reconciled });
}
