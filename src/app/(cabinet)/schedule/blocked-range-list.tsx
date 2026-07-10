"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeBlockedRange } from "./actions";

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
    return <p className="mt-4 text-gray-600">Заблокованих періодів немає.</p>;
  }

  return (
    <ul className="mt-4 divide-y rounded border bg-white">
      {ranges.map((range) => (
        <li key={range.id} className="flex items-center justify-between px-4 py-3">
          <span>
            {range.startAt.toLocaleString("uk-UA")} — {range.endAt.toLocaleString("uk-UA")}
            {range.reason ? ` · ${range.reason}` : ""}
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await removeBlockedRange(range.id);
                router.refresh();
              })
            }
            className="text-sm text-red-600 hover:underline disabled:opacity-50"
          >
            Видалити
          </button>
        </li>
      ))}
    </ul>
  );
}
