"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileFormState } from "./actions";

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
    <form action={formAction} className="mt-6 max-w-lg space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Ім&apos;я
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaultValues.name}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="slug" className="block text-sm font-medium">
          Публічний слаг (посилання для запису)
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          defaultValue={defaultValues.slug}
          pattern="[a-z0-9-]+"
          className="mt-1 w-full rounded border px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">trigger.example/{defaultValues.slug}</p>
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Опис
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaultValues.description}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="defaultSessionPrice" className="block text-sm font-medium">
          Стандартна вартість сесії, грн
        </label>
        <input
          id="defaultSessionPrice"
          name="defaultSessionPrice"
          type="number"
          min={0}
          step="1"
          defaultValue={defaultValues.defaultSessionPriceUah}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? <p className="text-sm text-green-600">Збережено</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Збереження..." : "Зберегти"}
      </button>
    </form>
  );
}
