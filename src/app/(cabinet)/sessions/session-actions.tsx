"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  confirmSession,
  cancelSession,
  rescheduleSession,
  updateSessionPrice,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

const PAYMENT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  NONE: { label: "без оплати", className: "text-ink-faint" },
  PENDING: { label: "очікує оплати", className: "text-warning" },
  PAID: { label: "оплачено", className: "text-success" },
  FAILED: { label: "оплата не вдалась", className: "text-danger" },
  REFUNDED: { label: "повернено", className: "text-info" },
};

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function PriceEditor({ sessionId, priceCents }: { sessionId: string; priceCents: number | null }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [value, setValue] = useState(priceCents != null ? String(priceCents / 100) : "");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <Input
        type="number"
        min={0}
        step="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="грн"
        aria-label="Вартість сесії, грн"
        className="w-20 min-w-0 flex-1 px-2 py-1 text-xs"
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const priceUah = value.trim() === "" ? null : Number(value);
            const result = await updateSessionPrice(sessionId, priceUah);
            setError(result.error ?? null);
            router.refresh();
          })
        }
      >
        {pending ? "..." : "OK"}
      </Button>
      {error ? (
        <p className="w-full text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PaymentSection({
  sessionId,
  priceCents,
  paymentStatus,
}: {
  sessionId: string;
  priceCents: number | null;
  paymentStatus: string;
}) {
  return (
    <div className="mt-2.5 border-t border-line pt-2">
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
        Оплата
      </div>
      <PriceEditor sessionId={sessionId} priceCents={priceCents} />
      {priceCents != null && paymentStatus !== "PAID" ? (
        <a
          href={`/pay/${sessionId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 block font-medium text-sage-700 underline decoration-sage-300 underline-offset-2 hover:decoration-sage-600"
        >
          Посилання на оплату
        </a>
      ) : null}
    </div>
  );
}

export function SessionActions({
  sessionId,
  status,
  startAt,
  priceCents,
  paymentStatus,
  defaultOpen = false,
}: {
  sessionId: string;
  status: string;
  startAt: string;
  priceCents: number | null;
  paymentStatus: string;
  defaultOpen?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [rescheduling, setRescheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showLifecycleActions = status !== "CANCELLED" && status !== "COMPLETED";
  const payment = PAYMENT_STATUS_LABELS[paymentStatus];

  return (
    <div className="min-w-0">
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className={payment?.className ?? "text-ink-muted"}>
          {payment?.label ?? paymentStatus}
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="shrink-0 rounded-full px-2 py-0.5 font-medium text-ink-muted transition-colors hover:bg-sand-100 hover:text-ink"
        >
          {open ? "Згорнути ↑" : "Дії ↓"}
        </button>
      </div>

      {open ? (
        <div>
          {showLifecycleActions ? (
            rescheduling ? (
              <form
                className="mt-2 space-y-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  startTransition(async () => {
                    const result = await rescheduleSession(sessionId, {}, formData);
                    if (result.error) {
                      setError(result.error);
                    } else {
                      setError(null);
                      setRescheduling(false);
                    }
                    router.refresh();
                  });
                }}
              >
                <Input
                  type="datetime-local"
                  name="startAt"
                  required
                  defaultValue={toDatetimeLocalValue(new Date(startAt))}
                  className="min-w-0 px-2 py-1 text-xs"
                />
                {error ? (
                  <p className="text-xs text-danger" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-1.5">
                  <Button type="submit" size="sm" disabled={pending}>
                    {pending ? "..." : "Зберегти"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRescheduling(false);
                      setError(null);
                    }}
                  >
                    Відмінити
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {status === "PENDING" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await confirmSession(sessionId);
                        setError(result.error ?? null);
                        router.refresh();
                      })
                    }
                  >
                    Підтвердити
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRescheduling(true)}
                >
                  Перенести
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await cancelSession(sessionId);
                      setError(result.error ?? null);
                      router.refresh();
                    })
                  }
                  className="text-danger hover:bg-danger-soft hover:text-danger"
                >
                  Скасувати
                </Button>
                {error ? (
                  <p className="w-full text-xs text-danger" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            )
          ) : null}

          <PaymentSection
            sessionId={sessionId}
            priceCents={priceCents}
            paymentStatus={paymentStatus}
          />

          <Link
            href={`/sessions/${sessionId}`}
            className="mt-2 block font-medium text-sage-700 underline decoration-sage-300 underline-offset-2 hover:decoration-sage-600"
          >
            Нотатка сесії
          </Link>
        </div>
      ) : null}
    </div>
  );
}
