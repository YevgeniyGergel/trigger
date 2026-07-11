import { z } from "zod";

export const serviceTypeSchema = z
  .object({
    name: z.string().trim().min(2, "Вкажіть назву").max(120),
    slotMinutes: z.number().int().min(1, "Тривалість має бути більшою за 0"),
    breakMinutes: z.number().int().nonnegative(),
    priceCents: z.number().int().nonnegative().optional().nullable(),
  })
  .refine((data) => data.breakMinutes < data.slotMinutes, {
    message: "Перерва має бути коротшою за тривалість слоту",
    path: ["breakMinutes"],
  });

export type ServiceTypeInput = z.infer<typeof serviceTypeSchema>;
