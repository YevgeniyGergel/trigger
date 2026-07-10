import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Вкажіть ім'я").max(120),
  email: z.string().trim().toLowerCase().email("Некоректний email"),
  password: z.string().min(8, "Пароль має містити щонайменше 8 символів").max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, "Вкажіть ім'я").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Слаг має містити щонайменше 3 символи")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Слаг може містити лише латинські літери, цифри та дефіс"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  defaultSessionPriceCents: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .nullable(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
