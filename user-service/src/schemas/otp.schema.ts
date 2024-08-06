import { z } from 'zod';

export const otpSchema = z.object({
    email: z.string().min(1, { message: 'Email is required' }).email({ message: 'Email is invalid' }),
});

export type OtpSchemaType = z.infer<typeof otpSchema>;
