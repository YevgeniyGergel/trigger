"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { startPayment, type StartPaymentResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function PayButton({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<Exclude<StartPaymentResult, { error: string }> | null>(
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Submitting a real <form> (rather than building one with
  // document.createElement) is what actually navigates the browser to
  // LiqPay's checkout — React can't POST-and-navigate via state alone, so
  // this still needs an imperative .submit() call, just on a form React
  // itself rendered instead of one assembled by hand.
  useEffect(() => {
    if (checkout) {
      formRef.current?.submit();
    }
  }, [checkout]);

  if (checkout) {
    return (
      <form ref={formRef} method="post" action={checkout.action} className="hidden">
        <input type="hidden" name="data" value={checkout.data} />
        <input type="hidden" name="signature" value={checkout.signature} />
      </form>
    );
  }

  return (
    <div>
      <Button
        type="button"
        size="lg"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await startPayment(sessionId);
            if ("error" in result) {
              setError(result.error);
              return;
            }
            setError(null);
            setCheckout(result);
          })
        }
        className="w-full"
      >
        {pending ? "Перенаправлення..." : "Оплатити карткою"}
      </Button>
      {error ? (
        <Alert tone="danger" className="mt-3">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
