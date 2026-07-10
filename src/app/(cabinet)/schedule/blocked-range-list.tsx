"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeBlockedRange } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Range = {
  id: string;
  startAt: Date;
  endAt: Date;
  reason: string | null;
};

export function BlockedRangeList({ ranges }: { ranges: Range[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (ranges.length === 0) {
    return (
      <p className="mt-4 text-sm text-ink-muted">Заблокованих періодів немає.</p>
    );
  }

  return (
    <Card className="mt-4 divide-y divide-line overflow-hidden">
      {ranges.map((range) => (
        <div
          key={range.id}
          className="flex items-center justify-between gap-4 px-5 py-3.5"
        >
          <span className="text-sm text-ink">
            {range.startAt.toLocaleString("uk-UA")} —{" "}
            {range.endAt.toLocaleString("uk-UA")}
            {range.reason ? (
              <span className="text-ink-muted"> · {range.reason}</span>
            ) : null}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await removeBlockedRange(range.id);
                router.refresh();
              })
            }
            className="text-danger hover:bg-danger-soft hover:text-danger"
          >
            Видалити
          </Button>
        </div>
      ))}
    </Card>
  );
}
