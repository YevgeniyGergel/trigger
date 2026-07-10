"use client";

import { useActionState, useState } from "react";
import { saveWorkingHours, type WorkingHoursFormState } from "./actions";

const initialState: WorkingHoursFormState = {};

const WEEKDAY_LABELS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

type Rule = { weekday: number; startTime: string; endTime: string };

export function WorkingHoursForm({ initialRules }: { initialRules: Rule[] }) {
  const [state, formAction, pending] = useActionState(saveWorkingHours, initialState);
  const [enabled, setEnabled] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(WEEKDAY_LABELS.map((_, i) => [i, initialRules.some((r) => r.weekday === i)]))
  );

  const ruleFor = (weekday: number) => initialRules.find((r) => r.weekday === weekday);

  return (
    <form action={formAction} className="mt-4 max-w-lg space-y-2">
      {WEEKDAY_LABELS.map((label, weekday) => {
        const rule = ruleFor(weekday);
        return (
          <div key={weekday} className="flex items-center gap-3">
            <label className="flex w-20 items-center gap-2">
              <input
                type="checkbox"
                name={`enabled_${weekday}`}
                defaultChecked={enabled[weekday]}
                onChange={(e) =>
                  setEnabled((prev) => ({ ...prev, [weekday]: e.target.checked }))
                }
              />
              {label}
            </label>
            <input
              type="time"
              name={`start_${weekday}`}
              defaultValue={rule?.startTime ?? "10:00"}
              disabled={!enabled[weekday]}
              className="rounded border px-2 py-1 disabled:opacity-40"
            />
            <span>—</span>
            <input
              type="time"
              name={`end_${weekday}`}
              defaultValue={rule?.endTime ?? "18:00"}
              disabled={!enabled[weekday]}
              className="rounded border px-2 py-1 disabled:opacity-40"
            />
          </div>
        );
      })}

      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? <p className="text-sm text-green-600">Збережено</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Збереження..." : "Зберегти розклад"}
      </button>
    </form>
  );
}
