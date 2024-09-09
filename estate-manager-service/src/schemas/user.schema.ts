import { z } from 'zod';
import { emailSchema, nameOfUserSchema, otpSchema, passwordSchema, phoneNumberSchema } from './validation.schema';

export const updateSchema = z.object({
    name: nameOfUserSchema,
    phoneNumber: phoneNumberSchema,
});

export type UpdateInput = z.infer<typeof updateSchema>;

export const updatePasswordSchema = z.object({
    password: passwordSchema,
    oldPassword: passwordSchema,
});

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

export const forgotPasswordSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    otp: otpSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
