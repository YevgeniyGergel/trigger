import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionAmountCents } from "@/lib/session-price";
import { PayButton } from "./pay-button";
import { Logo } from "@/components/ui/logo";
import { RippleBackdrop } from "@/components/ui/ripple";
import { Card, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/page-header";
import { formatKyiv } from "@/lib/timezone";

export default async function PayPage({
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

  const amountCents = getSessionAmountCents(session);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <RippleBackdrop />
      <div className="relative w-full max-w-md">
        <div className="flex justify-center">
          <Logo href={null} />
        </div>
        <Card className="mt-8 shadow-lifted">
          <CardBody className="p-8">
            <Eyebrow>Оплата сесії</Eyebrow>
            <h1 className="mt-2 font-display text-2xl font-medium tracking-tight text-ink">
              {session.psychologist.name}
            </h1>
            <p className="mt-1.5 text-sm text-ink-muted">
              {formatKyiv(session.startAt, { dateStyle: "medium", timeStyle: "short" })}
            </p>

            {session.paymentStatus === "PAID" ? (
              <Alert tone="success" className="mt-6">
                Сесію вже оплачено. Дякуємо!
              </Alert>
            ) : amountCents != null ? (
              <div className="mt-6">
                <div className="flex items-center justify-between rounded-xl bg-sand-100 px-4 py-3.5">
                  <span className="text-sm text-ink-muted">До сплати</span>
                  <span className="font-display text-2xl font-medium text-ink">
                    {(amountCents / 100).toFixed(2)} грн
                  </span>
                </div>
                {session.psychologist.liqpayMode === "TEST" ? (
                  <Badge tone="warning" className="mt-3">
                    Тестовий режим оплати
                  </Badge>
                ) : null}
                <div className="mt-5">
                  <PayButton sessionId={session.id} />
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm text-ink-muted">
                Вартість сесії ще не вказана.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
