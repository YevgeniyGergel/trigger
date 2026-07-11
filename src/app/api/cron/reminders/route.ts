import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyClient, sessionReminderForClient } from "@/lib/notifications";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const sessions = await prisma.session.findMany({
    where: { status: "CONFIRMED", startAt: { gt: now } },
    include: {
      client: true,
      psychologist: true,
      notifications: { where: { type: "SESSION_REMINDER" } },
    },
  });

  let sent = 0;
  for (const session of sessions) {
    if (session.notifications.length > 0) continue;

    const leadMs = session.psychologist.reminderLeadHours * 60 * 60 * 1000;
    if (session.startAt.getTime() - now.getTime() > leadMs) continue;

    try {
      await notifyClient(
        session.client,
        "SESSION_REMINDER",
        sessionReminderForClient(session.startAt, session.id),
        session.id
      );
      sent += 1;
    } catch (error) {
      console.error(`[cron reminders] failed for session ${session.id}:`, error);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
