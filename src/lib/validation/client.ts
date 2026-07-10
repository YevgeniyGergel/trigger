import { z } from "zod";

export const clientSchema = z
  .object({
    name: z.string().trim().min(2, "Вкажіть ім'я клієнта").max(120),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    email: z.string().trim().toLowerCase().email("Некоректний email").optional().or(z.literal("")),
  })
  .refine((data) => data.phone || data.email, {
    message: "Вкажіть телефон або email",
    path: ["phone"],
  });

export type ClientInput = z.infer<typeof clientSchema>;
