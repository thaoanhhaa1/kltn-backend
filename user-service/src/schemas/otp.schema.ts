import { z } from 'zod';

export const otpSchema = z.object({
    email: z.string().email(),
});

export type OtpSchemaType = z.infer<typeof otpSchema>;
