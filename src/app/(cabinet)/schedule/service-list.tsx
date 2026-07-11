"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateServiceType,
  setServiceTypeActive,
  setDefaultServiceType,
  deleteServiceType,
  moveServiceType,
  type ServiceTypeFormState,
} from "./service-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

export type ServiceTypeRow = {
  id: string;
  name: string;
  slotMinutes: number;
  breakMinutes: number;
  priceCents: number | null;
  isDefault: boolean;
  active: boolean;
  _count: { sessions: number };
};

function formatPrice(priceCents: number | null): string {
  if (priceCents == null) return "не вказано";
  return `${(priceCents / 100).toLocaleString("uk-UA")} грн`;
}

const editInitialState: ServiceTypeFormState = {};

function ServiceEditForm({
  service,
  onDone,
}: {
  service: ServiceTypeRow;
  onDone: () => void;
}) {
  const boundAction = updateServiceType.bind(null, service.id);
  const [state, formAction, pending] = useActionState(boundAction, editInitialState);

  const [lastHandledState, setLastHandledState] = useState(editInitialState);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.success) {
      onDone();
    }
  }

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor={`name-${service.id}`}>Назва</Label>
        <Input id={`name-${service.id}`} name="name" type="text" required defaultValue={service.name} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`slotMinutes-${service.id}`}>Тривалість слоту, хв</Label>
          <Input
            id={`slotMinutes-${service.id}`}
            name="slotMinutes"
            type="number"
            min={1}
            step="1"
            required
            defaultValue={service.slotMinutes}
          />
        </div>
        <div>
          <Label htmlFor={`breakMinutes-${service.id}`}>Перерва, хв</Label>
          <Input
            id={`breakMinutes-${service.id}`}
            name="breakMinutes"
            type="number"
            min={0}
            step="1"
            defaultValue={service.breakMinutes}
          />
        </div>
      </div>
      <div>
        <Label htmlFor={`priceUah-${service.id}`}>Вартість, грн</Label>
        <Input
          id={`priceUah-${service.id}`}
          name="priceUah"
          type="number"
          min={0}
          step="1"
          defaultValue={service.priceCents != null ? service.priceCents / 100 : undefined}
        />
      </div>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Збереження..." : "Зберегти"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Скасувати
        </Button>
      </div>
    </form>
  );
}

function ServiceRow({
  service,
  isFirst,
  isLast,
}: {
  service: ServiceTypeRow;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (editing) {
    return (
      <div className="px-5 py-4">
        <ServiceEditForm service={service} onDone={() => setEditing(false)} />
      </div>
    );
  }

  const sessionLength = service.slotMinutes - service.breakMinutes;

  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-base font-medium text-ink">{service.name}</span>
            {service.isDefault ? <Badge tone="sage">за замовчуванням</Badge> : null}
            {!service.active ? <Badge tone="neutral">неактивна</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            {sessionLength} хв сесія
            {service.breakMinutes > 0 ? ` + ${service.breakMinutes} хв перерва` : ""} ·{" "}
            {formatPrice(service.priceCents)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending || isFirst}
            onClick={() =>
              startTransition(async () => {
                await moveServiceType(service.id, "up");
                router.refresh();
              })
            }
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending || isLast}
            onClick={() =>
              startTransition(async () => {
                await moveServiceType(service.id, "down");
                router.refresh();
              })
            }
          >
            ↓
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Редагувати
          </Button>
          {!service.isDefault && service.active ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await setDefaultServiceType(service.id);
                  setError(result.error ?? null);
                  router.refresh();
                })
              }
            >
              Зробити типовою
            </Button>
          ) : null}
          <Button
            type="button"
            variant={service.active ? "danger" : "secondary"}
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await setServiceTypeActive(service.id, !service.active);
                setError(result.error ?? null);
                router.refresh();
              })
            }
          >
            {service.active ? "Деактивувати" : "Активувати"}
          </Button>
          {!service.isDefault && service._count.sessions === 0 ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteServiceType(service.id);
                  setError(result.error ?? null);
                  router.refresh();
                })
              }
            >
              Видалити
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ServiceList({ services }: { services: ServiceTypeRow[] }) {
  if (services.length === 0) {
    return <p className="mt-4 text-sm text-ink-muted">Послуг ще немає.</p>;
  }

  return (
    <Card className="mt-4 divide-y divide-line overflow-hidden">
      {services.map((service, i) => (
        <ServiceRow
          key={service.id}
          service={service}
          isFirst={i === 0}
          isLast={i === services.length - 1}
        />
      ))}
    </Card>
  );
}
