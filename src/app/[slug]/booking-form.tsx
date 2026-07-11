"use client";

import { useActionState, useMemo, useState } from "react";
import { createBooking, type BookingFormState } from "./actions";
import { generateAvailableSlots, type WorkingHourRule, type DateRange } from "@/lib/slots";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type Slot = { startAt: string; endAt: string };

type Service = {
  id: string;
  name: string;
  slotMinutes: number;
  breakMinutes: number;
  priceCents: number | null;
  isDefault: boolean;
};

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

function formatPrice(priceCents: number | null): string {
  if (priceCents == null) return "ціна за домовленістю";
  return `${(priceCents / 100).toLocaleString("uk-UA")} грн`;
}

export function BookingForm({
  slug,
  services,
  workingHours,
  blockedRanges,
  bookedRanges,
  fromDate,
  toDate,
}: {
  slug: string;
  services: Service[];
  workingHours: WorkingHourRule[];
  blockedRanges: { startAt: string; endAt: string }[];
  bookedRanges: { startAt: string; endAt: string }[];
  fromDate: string;
  toDate: string;
}) {
  const boundAction = createBooking.bind(null, slug);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const defaultService = services.find((s) => s.isDefault) ?? services[0];
  const [selectedServiceId, setSelectedServiceId] = useState(defaultService?.id ?? null);
  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null;

  const parsedRanges = useMemo(
    () => ({
      blocked: blockedRanges.map((r): DateRange => ({ startAt: new Date(r.startAt), endAt: new Date(r.endAt) })),
      booked: bookedRanges.map((r): DateRange => ({ startAt: new Date(r.startAt), endAt: new Date(r.endAt) })),
      from: new Date(fromDate),
      to: new Date(toDate),
    }),
    [blockedRanges, bookedRanges, fromDate, toDate]
  );

  const slots = useMemo<Slot[]>(() => {
    if (!selectedService) return [];
    const generated = generateAvailableSlots({
      workingHours,
      slotMinutes: selectedService.slotMinutes,
      blockedRanges: parsedRanges.blocked,
      bookedRanges: parsedRanges.booked,
      fromDate: parsedRanges.from,
      toDate: parsedRanges.to,
    });
    return generated.map((s) => ({ startAt: s.startAt.toISOString(), endAt: s.endAt.toISOString() }));
  }, [selectedService, workingHours, parsedRanges]);

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

  const activeDay = groupedByDay.find((g) => g.key === activeDayKey) ?? groupedByDay[0];

  if (state.success) {
    return (
      <Alert tone="success" className="mt-6 px-5 py-4">
        Запис створено! Психолог підтвердить сесію найближчим часом.
      </Alert>
    );
  }

  return (
    <div className="mt-5">
      {/* Крок 1: послуга */}
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
        1 · Послуга
      </p>
      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
        {services.map((service) => {
          const active = service.id === selectedServiceId;
          const sessionLength = service.slotMinutes - service.breakMinutes;
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => {
                setSelectedServiceId(service.id);
                setActiveDayKey(null);
                setSelected(null);
              }}
              className={cn(
                "flex flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition-all",
                active
                  ? "border-sage-600 bg-sage-600 text-white shadow-soft"
                  : "border-line bg-surface text-ink shadow-soft hover:border-sage-400"
              )}
            >
              <span className="flex items-center gap-2 font-display text-base font-medium">
                {service.name}
                {service.isDefault ? (
                  <Badge tone={active ? "neutral" : "sage"} className={active ? "bg-white/20 text-white" : undefined}>
                    типова
                  </Badge>
                ) : null}
              </span>
              <span className={cn("text-sm", active ? "text-sage-100" : "text-ink-muted")}>
                {sessionLength} хв · {formatPrice(service.priceCents)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Крок 2: день */}
      {selectedService ? (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            2 · День
          </p>
          {groupedByDay.length === 0 ? (
            <p className="mt-2.5 text-sm text-ink-faint">
              Наразі немає доступних слотів для цієї послуги.
            </p>
          ) : (
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
          )}
        </div>
      ) : null}

      {/* Крок 3: час */}
      {activeDay ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            3 · Час
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

      {/* Крок 4: контакти */}
      {selected && selectedService ? (
        <Card className="mt-8 max-w-md shadow-lifted">
          <CardBody>
            <form action={formAction} className="space-y-5">
              <input type="hidden" name="startAt" value={selected.startAt} />
              <input type="hidden" name="serviceTypeId" value={selectedService.id} />
              <p className="rounded-xl bg-sage-50 px-4 py-3 text-sm text-sage-800">
                {selectedService.name}, обраний час:{" "}
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
          Оберіть послугу, день і час — і залишиться лише вказати контакти.
        </p>
      )}
    </div>
  );
}
