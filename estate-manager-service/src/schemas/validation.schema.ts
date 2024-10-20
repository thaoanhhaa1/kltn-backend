import { z } from 'zod';

export const passwordSchema = z
    .string()
    .min(1, { message: 'Mật khẩu không được để trống' })
    .min(6, { message: 'Mật khẩu phải chứa ít nhất 6 ký tự' })
    .regex(/^(?=.*[A-Za-z])(?=.*\d).{6,}$/, {
        message: 'Mật khẩu phải chứa ít nhất một chữ cái và một số',
    });

export const phoneNumberSchema = z
    .string()
    .nullable()
    .refine((value) => !value || /^0\d{9}$/.test(value), {
        message: 'Số điện thoại phải bắt đầu bằng số 0 và có 10 chữ số',
    });

export const nameOfUserSchema = z.string().min(1, { message: 'Tên không được để trống' });

export const emailSchema = z
    .string()
    .min(1, { message: 'Email không được để trống' })
    .email({ message: 'Email không hợp lệ' });

export const userTypeSchema = z.enum(['renter', 'owner'], {
    message: 'Loại người dùng phải là "renter" hoặc "owner"',
});

export const otpSchema = z
    .string()
    .min(1, { message: 'Mã OTP không được để trống' })
    .length(6, { message: 'Mã OTP phải có 6 ký tự' });
