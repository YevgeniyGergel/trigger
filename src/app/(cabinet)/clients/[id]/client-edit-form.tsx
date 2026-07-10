"use client";

import { useActionState } from "react";
import { updateClient, type ClientFormState } from "../actions";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

const initialState: ClientFormState = {};

type Props = {
  clientId: string;
  defaultValues: {
    name: string;
    phone: string;
    email: string;
  };
};

export function ClientEditForm({ clientId, defaultValues }: Props) {
  const boundAction = updateClient.bind(null, clientId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Card className="self-start">
      <CardBody>
        <form action={formAction} className="space-y-5">
          <div>
            <Label htmlFor="name">Ім&apos;я</Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={defaultValues.name}
            />
          </div>
          <div>
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={defaultValues.phone}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaultValues.email}
            />
          </div>
          {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Збереження..." : "Зберегти"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
