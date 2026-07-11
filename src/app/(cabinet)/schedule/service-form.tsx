"use client";

import { useActionState, useState } from "react";
import { createServiceType, type ServiceTypeFormState } from "./service-actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

const initialState: ServiceTypeFormState = {};

export function ServiceForm() {
  const [state, formAction, pending] = useActionState(createServiceType, initialState);

  // Uncontrolled fields don't reset themselves after a successful create —
  // remount the form via key to clear it, same trick as WorkingHoursForm.
  const [formKey, setFormKey] = useState(0);
  const [lastHandledState, setLastHandledState] = useState(initialState);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.success) {
      setFormKey((k) => k + 1);
    }
  }

  return (
    <form key={formKey} action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Назва</Label>
        <Input id="name" name="name" type="text" required placeholder="Стандартна консультація" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="slotMinutes">Тривалість слоту, хв</Label>
          <Input id="slotMinutes" name="slotMinutes" type="number" min={1} step="1" required defaultValue={50} />
        </div>
        <div>
          <Label htmlFor="breakMinutes">Перерва, хв</Label>
          <Input id="breakMinutes" name="breakMinutes" type="number" min={0} step="1" defaultValue={10} />
        </div>
      </div>
      <div>
        <Label htmlFor="priceUah">Вартість, грн</Label>
        <Input id="priceUah" name="priceUah" type="number" min={0} step="1" />
      </div>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">Послугу додано</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Збереження..." : "Додати послугу"}
      </Button>
    </form>
  );
}
