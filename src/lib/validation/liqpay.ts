import { z } from "zod";

export const liqpayCredentialsSchema = z.object({
  publicKey: z.string().trim().min(10, "Некоректний public_key"),
  privateKey: z
    .string()
    .trim()
    .min(10, "Некоректний private_key")
    .optional()
    .or(z.literal("")),
  mode: z.enum(["TEST", "PRODUCTION"]),
});

export type LiqpayCredentialsInput = z.infer<typeof liqpayCredentialsSchema>;
