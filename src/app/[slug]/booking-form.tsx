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

type DayGroup = { key: string; date: Date; slots: Slot[] };

function slotsWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "слот";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "слоти";
  return "слотів";
}

export function BookingForm({ slug, slots }: { slug: string; slots: Slot[] }) {
  const boundAction = createBooking.bind(null, slug);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const groupedByDay = useMemo<DayGroup[]>(() => {
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
    return Array.from(groups.entries()).map(([key, daySlots]) => ({
      key,
      date: new Date(daySlots[0].startAt),
      slots: daySlots,
    }));
  }, [slots]);

  const [activeDayKey, setActiveDayKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);

  const activeDay =
    groupedByDay.find((g) => g.key === activeDayKey) ?? groupedByDay[0];

  if (state.success) {
    return (
      <Alert tone="success" className="mt-6 px-5 py-4">
        Запис створено! Психолог підтвердить сесію найближчим часом.
      </Alert>
    );
  }

  return (
    <div className="mt-5">
      {/* Крок 1: день */}
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
        1 · День
      </p>
      <div className="-mx-1 mt-2.5 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
        {groupedByDay.map((group) => {
          const active = group.key === activeDay?.key;
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => {
                setActiveDayKey(group.key);
                setSelected(null);
              }}
              className={cn(
                "flex shrink-0 snap-start flex-col items-center rounded-2xl border px-4 py-2.5 transition-all",
                active
                  ? "border-sage-600 bg-sage-600 text-white shadow-soft"
                  : "border-line bg-surface text-ink shadow-soft hover:border-sage-400"
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.14em]",
                  active ? "text-sage-100" : "text-ink-muted"
                )}
              >
                {DAY_LABELS[group.date.getDay()]}
              </span>
              <span className="mt-0.5 font-display text-base font-medium">
                {group.date.getDate()}.
                {String(group.date.getMonth() + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-[11px]",
                  active ? "text-sage-100" : "text-ink-faint"
                )}
              >
                {group.slots.length} {slotsWord(group.slots.length)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Крок 2: час */}
      {activeDay ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            2 · Час
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {activeDay.slots.map((slot) => {
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
      ) : null}

      {/* Крок 3: контакти */}
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
      ) : (
        <p className="mt-6 text-sm text-ink-faint">
          Оберіть час — і залишиться лише вказати контакти.
        </p>
      )}
    </div>
  );
}
