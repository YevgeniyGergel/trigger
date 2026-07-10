"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginPsychologist, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginPsychologist, initialState);

  return (
    <div className="mx-auto mt-24 max-w-sm px-4">
      <h1 className="text-xl font-semibold">Вхід</h1>
      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Пароль
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
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
          className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {pending ? "Вхід..." : "Увійти"}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        Ще немає акаунту?{" "}
        <Link href="/register" className="underline">
          Зареєструватися
        </Link>
      </p>
    </div>
  );
}
