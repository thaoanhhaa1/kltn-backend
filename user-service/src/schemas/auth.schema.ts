import { z } from 'zod';

export const registerSchema = z.object({
    email: z
        .string({
            required_error: 'Email is required',
        })
        .email({ message: 'Email is invalid' }),
    password: z
        .string({
            required_error: 'Password is required',
        })
        .min(6, { message: 'Password must be at least 6 characters long' })
        .regex(/^(?=.*[A-Za-z])(?=.*\d).{6,}$/, {
            message: 'Password must contain at least one letter, one number',
        }),
    userType: z.enum(['renter', 'owner'], { message: 'User type must be "renter" or "owner"' }),
    name: z.string({
        required_error: 'Name is required',
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
    email: z
        .string({
            required_error: 'Email is required',
        })
        .email({ message: 'Email is invalid' }),
    password: z
        .string({
            required_error: 'Password is required',
        })
        .min(6, { message: 'Password must be at least 6 characters long' })
        .regex(/^(?=.*[A-Za-z])(?=.*\d).{6,}$/, {
            message: 'Password must contain at least one letter, one number',
        }),
});

export type LoginInput = z.infer<typeof loginSchema>;
