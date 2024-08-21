import { z } from 'zod';

export const passwordSchema = z
    .string()
    .min(1, { message: 'Password is required' })
    .min(6, { message: 'Password must be at least 6 characters long' })
    .regex(/^(?=.*[A-Za-z])(?=.*\d).{6,}$/, {
        message: 'Password must contain at least one letter, one number',
    });

export const phoneNumberSchema = z
    .string()
    .min(10, { message: 'Phone number must be at least 10 digits long' })
    .regex(/^0\d{9}$/, { message: 'Phone number must start with 0' })
    .optional();

export const nameOfUserSchema = z.string().min(1, { message: 'Name is required' });

export const emailSchema = z.string().min(1, { message: 'Email is required' }).email({ message: 'Email is invalid' });

export const userTypeSchema = z.enum(['renter', 'owner'], { message: 'User type must be "renter" or "owner"' });

export const otpSchema = z
    .string()
    .min(1, { message: 'OTP is required' })
    .length(6, { message: 'OTP must be 6 characters long' });
