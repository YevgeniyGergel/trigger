"use client";

import { useActionState, useState } from "react";
import { saveWorkingHours, type WorkingHoursFormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

const initialState: WorkingHoursFormState = {};

const WEEKDAY_LABELS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
// Тиждень в Україні починається з понеділка; weekday-індекси в базі
// лишаються 0 = неділя, змінюється лише порядок відображення.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

type Rule = { weekday: number; startTime: string; endTime: string };

export function WorkingHoursForm({ initialRules }: { initialRules: Rule[] }) {
  const [state, formAction, pending] = useActionState(saveWorkingHours, initialState);
  const [enabled, setEnabled] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(WEEKDAY_LABELS.map((_, i) => [i, initialRules.some((r) => r.weekday === i)]))
  );

  const ruleFor = (weekday: number) => initialRules.find((r) => r.weekday === weekday);

  return (
    <form action={formAction} className="space-y-2">
      {WEEKDAY_ORDER.map((weekday) => {
        const label = WEEKDAY_LABELS[weekday];
        const rule = ruleFor(weekday);
        return (
          <div
            key={weekday}
            className={`flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors ${
              enabled[weekday] ? "bg-sage-50" : ""
            }`}
          >
            <label className="flex w-20 cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
              <input
                type="checkbox"
                name={`enabled_${weekday}`}
                defaultChecked={enabled[weekday]}
                onChange={(e) =>
                  setEnabled((prev) => ({ ...prev, [weekday]: e.target.checked }))
                }
                className="size-4 accent-sage-600"
              />
              {label}
            </label>
            <Input
              type="time"
              name={`start_${weekday}`}
              defaultValue={rule?.startTime ?? "10:00"}
              disabled={!enabled[weekday]}
              className="w-auto px-2.5 py-1.5"
            />
            <span className="text-ink-faint">—</span>
            <Input
              type="time"
              name={`end_${weekday}`}
              defaultValue={rule?.endTime ?? "18:00"}
              disabled={!enabled[weekday]}
              className="w-auto px-2.5 py-1.5"
            />
          </div>
        );
      })}

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">Збережено</Alert> : null}

      <Button type="submit" disabled={pending} className="mt-3">
        {pending ? "Збереження..." : "Зберегти розклад"}
      </Button>
    </form>
  );
}
