"use client";

import { useActionState } from "react";
import { createClient, type ClientFormState } from "../actions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

const initialState: ClientFormState = {};

export default function NewClientPage() {
  const [state, formAction, pending] = useActionState(createClient, initialState);

  return (
    <div>
      <PageHeader
        eyebrow="Практика"
        title="Новий клієнт"
        description="Ім'я обов'язкове — контакти можна додати пізніше."
      />
      <Card className="mt-8 max-w-md">
        <CardBody>
          <form action={formAction} className="space-y-5">
            <div>
              <Label htmlFor="name">Ім&apos;я</Label>
              <Input id="name" name="name" type="text" required />
            </div>
            <div>
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" name="phone" type="tel" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Збереження..." : "Додати клієнта"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
