import { z } from 'zod';

export const dateValidation = z
    .string({
        required_error: 'Ngày huỷ không được để trống',
    })
    .superRefine((date, ctx) => {
        console.log('🚀 ~ .refine ~ date:', date);
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        console.log(!dateRegex.test(date));
        if (!dateRegex.test(date)) {
            ctx.addIssue({
                code: 'invalid_date',
                message: 'Ngày huỷ phải có định dạng YYYY-MM-DD',
            });
            return;
        }

        const inputDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of the day

        if (inputDate < today) {
            ctx.addIssue({
                code: 'invalid_date',
                message: 'Ngày huỷ không thể trước ngày hiện tại',
            });
            return;
        }
    });
