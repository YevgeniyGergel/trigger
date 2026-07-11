"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Hint } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

const initialState: ProfileFormState = {};

type Props = {
  defaultValues: {
    name: string;
    slug: string;
    description: string;
    defaultSessionPriceUah: string;
  };
};

export function ProfileForm({ defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
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
        <Label htmlFor="slug">Публічний слаг (посилання для запису)</Label>
        <Input
          id="slug"
          name="slug"
          type="text"
          required
          defaultValue={defaultValues.slug}
          pattern="[a-z0-9-]+"
        />
        <Hint>trigger.example/{defaultValues.slug}</Hint>
      </div>
      <div>
        <Label htmlFor="description">Опис</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaultValues.description}
        />
      </div>
      <div>
        <Label htmlFor="defaultSessionPrice">
          Стандартна вартість сесії, грн
        </Label>
        <Input
          id="defaultSessionPrice"
          name="defaultSessionPrice"
          type="number"
          min={0}
          step="1"
          defaultValue={defaultValues.defaultSessionPriceUah}
        />
      </div>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">Збережено</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Збереження..." : "Зберегти"}
      </Button>
    </form>
  );
}
