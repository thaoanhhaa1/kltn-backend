import { z } from 'zod';
import { emailSchema, nameOfUserSchema, otpSchema, passwordSchema, userTypeSchema } from './validation.schema';

export const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    userType: userTypeSchema,
    name: nameOfUserSchema,
    otp: otpSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
