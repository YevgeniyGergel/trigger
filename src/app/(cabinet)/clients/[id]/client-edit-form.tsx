"use client";

import { useActionState } from "react";
import { updateClient, type ClientFormState } from "../actions";

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
    <form action={formAction} className="mt-4 max-w-md space-y-4">
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
        <label htmlFor="phone" className="block text-sm font-medium">
          Телефон
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={defaultValues.phone}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultValues.email}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
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
