import { z } from "zod";

export const bookingSchema = z
  .object({
    name: z.string().trim().min(2, "Вкажіть ім'я").max(120),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    email: z.string().trim().toLowerCase().email("Некоректний email").optional().or(z.literal("")),
    startAt: z.string().min(1, "Оберіть час"),
    serviceTypeId: z.string().min(1, "Оберіть послугу"),
  })
  .refine((data) => data.phone || data.email, {
    message: "Вкажіть телефон або email",
    path: ["phone"],
  });

export type BookingInput = z.infer<typeof bookingSchema>;
