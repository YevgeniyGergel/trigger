import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const workingHoursSchema = z
  .array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      startTime: z.string().regex(timePattern, "Некоректний час"),
      endTime: z.string().regex(timePattern, "Некоректний час"),
    })
  )
  .refine((rules) => rules.every((rule) => rule.startTime < rule.endTime), {
    message: "Час початку має бути раніше часу завершення",
  });

export type WorkingHoursInput = z.infer<typeof workingHoursSchema>;

export const blockedRangeSchema = z
  .object({
    startAt: z.string().min(1, "Вкажіть дату початку"),
    endAt: z.string().min(1, "Вкажіть дату завершення"),
    reason: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .refine((data) => new Date(data.startAt) < new Date(data.endAt), {
    message: "Дата початку має бути раніше дати завершення",
    path: ["endAt"],
  });

export type BlockedRangeInput = z.infer<typeof blockedRangeSchema>;
