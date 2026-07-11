"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retrySessionSyncAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function RetrySyncButton({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="mt-2">
      <Alert tone="warning">
        Не вдалося синхронізувати календар або посилання на зустріч.{" "}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await retrySessionSyncAction(sessionId);
              setError(result.error ?? null);
              router.refresh();
            })
          }
          className="ml-1"
        >
          {pending ? "..." : "Повторити"}
        </Button>
      </Alert>
      {error ? (
        <p className="mt-1 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
