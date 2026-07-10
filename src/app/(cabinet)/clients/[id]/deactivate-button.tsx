"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setClientActive } from "../actions";

export function DeactivateButton({ clientId, active }: { clientId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await setClientActive(clientId, !active);
          router.refresh();
        });
      }}
      className="rounded border px-4 py-2 text-sm disabled:opacity-50"
    >
      {active ? "Деактивувати клієнта" : "Активувати клієнта"}
    </button>
  );
}
