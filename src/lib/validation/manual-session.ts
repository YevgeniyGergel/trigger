import { z } from "zod";

export const manualSessionSchema = z.object({
  clientId: z.string().min(1, "Оберіть клієнта"),
  serviceTypeId: z.string().min(1, "Оберіть послугу"),
  startAt: z.string().min(1, "Вкажіть дату й час"),
});

export type ManualSessionInput = z.infer<typeof manualSessionSchema>;
