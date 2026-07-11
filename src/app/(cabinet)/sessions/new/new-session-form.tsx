"use client";

import { useActionState } from "react";
import { createManualSession, type ManualSessionFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

const initialState: ManualSessionFormState = {};

function formatPrice(priceCents: number | null): string {
  if (priceCents == null) return "ціна за домовленістю";
  return `${(priceCents / 100).toLocaleString("uk-UA")} грн`;
}

export function NewSessionForm({
  clients,
  services,
  defaultClientId,
}: {
  clients: { id: string; name: string }[];
  services: {
    id: string;
    name: string;
    slotMinutes: number;
    breakMinutes: number;
    priceCents: number | null;
    isDefault: boolean;
  }[];
  defaultClientId?: string;
}) {
  const [state, formAction, pending] = useActionState(createManualSession, initialState);
  const defaultService = services.find((s) => s.isDefault) ?? services[0];

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <Label htmlFor="clientId">Клієнт</Label>
        <Select id="clientId" name="clientId" required defaultValue={defaultClientId ?? ""}>
          <option value="" disabled>
            Оберіть клієнта
          </option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="serviceTypeId">Послуга</Label>
        <Select id="serviceTypeId" name="serviceTypeId" required defaultValue={defaultService?.id}>
          {services.map((service) => {
            const sessionLength = service.slotMinutes - service.breakMinutes;
            return (
              <option key={service.id} value={service.id}>
                {service.name} · {sessionLength} хв · {formatPrice(service.priceCents)}
              </option>
            );
          })}
        </Select>
      </div>
      <div>
        <Label htmlFor="startAt">Дата й час</Label>
        <Input id="startAt" name="startAt" type="datetime-local" required />
      </div>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Створення..." : "Створити сесію"}
      </Button>
    </form>
  );
}
