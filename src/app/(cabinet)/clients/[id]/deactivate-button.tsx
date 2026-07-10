"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setClientActive } from "../actions";
import { Button } from "@/components/ui/button";

export function DeactivateButton({ clientId, active }: { clientId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant={active ? "danger" : "secondary"}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await setClientActive(clientId, !active);
          router.refresh();
        });
      }}
    >
      {active ? "Деактивувати клієнта" : "Активувати клієнта"}
    </Button>
  );
}
