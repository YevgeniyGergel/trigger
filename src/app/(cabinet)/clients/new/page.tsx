"use client";

import { useActionState } from "react";
import { createClient, type ClientFormState } from "../actions";

const initialState: ClientFormState = {};

export default function NewClientPage() {
  const [state, formAction, pending] = useActionState(createClient, initialState);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Новий клієнт</h1>
      <form action={formAction} className="mt-6 max-w-md space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Ім&apos;я
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
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
          {pending ? "Збереження..." : "Додати"}
        </button>
      </form>
    </div>
  );
}
