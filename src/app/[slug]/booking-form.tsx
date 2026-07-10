"use client";

import { useActionState, useMemo, useState } from "react";
import { createBooking, type BookingFormState } from "./actions";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

type Slot = { startAt: string; endAt: string };

const initialState: BookingFormState = {};

const DAY_LABELS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export function BookingForm({ slug, slots }: { slug: string; slots: Slot[] }) {
  const [selected, setSelected] = useState<Slot | null>(null);
  const boundAction = createBooking.bind(null, slug);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const groupedByDay = useMemo(() => {
    const groups = new Map<string, Slot[]>();
    for (const slot of slots) {
      const key = new Date(slot.startAt).toDateString();
      const existing = groups.get(key);
      if (existing) {
        existing.push(slot);
      } else {
        groups.set(key, [slot]);
      }
    }
    return Array.from(groups.values());
  }, [slots]);

  if (state.success) {
    return (
      <Alert tone="success" className="mt-6 px-5 py-4">
        Запис створено! Психолог підтвердить сесію найближчим часом.
      </Alert>
    );
  }

  return (
    <div className="mt-5">
      <div className="space-y-5">
        {groupedByDay.map((daySlots) => {
          const date = new Date(daySlots[0].startAt);
          return (
            <div key={daySlots[0].startAt}>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {DAY_LABELS[date.getDay()]} {date.getDate()}.
                {String(date.getMonth() + 1).padStart(2, "0")}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {daySlots.map((slot) => {
                  const active = selected?.startAt === slot.startAt;
                  return (
                    <button
                      key={slot.startAt}
                      type="button"
                      onClick={() => setSelected(slot)}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm transition-all",
                        active
                          ? "border-sage-600 bg-sage-600 text-white shadow-soft"
                          : "border-line bg-surface text-ink shadow-soft hover:border-sage-400 hover:text-sage-700"
                      )}
                    >
                      {new Date(slot.startAt).toLocaleTimeString("uk-UA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selected ? (
        <Card className="mt-8 max-w-md shadow-lifted">
          <CardBody>
            <form action={formAction} className="space-y-5">
              <input type="hidden" name="startAt" value={selected.startAt} />
              <p className="rounded-xl bg-sage-50 px-4 py-3 text-sm text-sage-800">
                Обраний час:{" "}
                <span className="font-medium">
                  {new Date(selected.startAt).toLocaleString("uk-UA", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </span>
              </p>
              <div>
                <Label htmlFor="name">Ім&apos;я</Label>
                <Input id="name" name="name" type="text" required />
              </div>
              <div>
                <Label htmlFor="phone">Телефон</Label>
                <Input id="phone" name="phone" type="tel" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Бронювання..." : "Забронювати"}
              </Button>
            </form>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
