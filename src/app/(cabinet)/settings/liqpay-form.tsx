"use client";

import { useActionState } from "react";
import { updateLiqpayCredentials, type LiqpayFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

const initialState: LiqpayFormState = {};

type Props = {
  hasCredentials: boolean;
  publicKey: string;
  mode: "TEST" | "PRODUCTION";
};

export function LiqpayForm({ hasCredentials, publicKey, mode }: Props) {
  const [state, formAction, pending] = useActionState(updateLiqpayCredentials, initialState);

  return (
    <div>
      <p className="text-sm text-ink-muted">
        {hasCredentials
          ? "LiqPay підключено. Введіть нові ключі, щоб замінити поточні."
          : "Зареєструйте мерчант-акаунт на liqpay.ua і вставте видані ключі."}
      </p>
      <form action={formAction} className="mt-5 space-y-5">
        <div>
          <Label htmlFor="publicKey">Public key</Label>
          <Input
            id="publicKey"
            name="publicKey"
            type="text"
            required
            defaultValue={publicKey}
          />
        </div>
        <div>
          <Label htmlFor="privateKey">Private key</Label>
          <Input
            id="privateKey"
            name="privateKey"
            type="password"
            required={!hasCredentials}
            placeholder={hasCredentials ? "Залиште порожнім, щоб не змінювати" : ""}
          />
        </div>
        <div>
          <Label htmlFor="mode">Режим</Label>
          <Select id="mode" name="mode" defaultValue={mode}>
            <option value="TEST">Тестовий</option>
            <option value="PRODUCTION">Робочий</option>
          </Select>
        </div>
        {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
        {state.success ? <Alert tone="success">Збережено</Alert> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Збереження..." : "Зберегти"}
        </Button>
      </form>
    </div>
  );
}
