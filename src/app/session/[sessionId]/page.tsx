import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/ui/logo";
import { RippleBackdrop } from "@/components/ui/ripple";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/page-header";
import { formatKyiv } from "@/lib/timezone";

const STATUS_BADGES: Record<
  string,
  { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" | "sage" }
> = {
  PENDING: { label: "очікує підтвердження", tone: "warning" },
  CONFIRMED: { label: "підтверджено", tone: "sage" },
  CANCELLED: { label: "скасовано", tone: "danger" },
  COMPLETED: { label: "завершено", tone: "success" },
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  NONE: "без оплати",
  PENDING: "очікує оплати",
  PAID: "оплачено",
  FAILED: "оплата не вдалась",
  REFUNDED: "повернено",
};

export default async function SessionStatusPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { psychologist: true },
  });
  if (!session) {
    notFound();
  }

  const status = STATUS_BADGES[session.status];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <RippleBackdrop />
      <div className="relative w-full max-w-md">
        <div className="flex justify-center">
          <Logo href={null} />
        </div>
        <Card className="mt-8 shadow-lifted">
          <CardBody className="p-8">
            <Eyebrow>Статус запису</Eyebrow>
            <h1 className="mt-2 font-display text-2xl font-medium tracking-tight text-ink">
              {session.psychologist.name}
            </h1>
            <p className="mt-1.5 text-sm text-ink-muted">
              {formatKyiv(session.startAt, { dateStyle: "medium", timeStyle: "short" })}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
              <Badge tone="neutral">
                {PAYMENT_STATUS_LABELS[session.paymentStatus] ?? session.paymentStatus}
              </Badge>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
