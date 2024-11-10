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

export const renterIdValidation = z.string({
    required_error: 'Mã người thuê là bắt buộc',
});

export const ownerIdValidation = z.string({
    required_error: 'Mã chủ nhà là bắt buộc',
});

export const contractIdValidation = z.string({
    required_error: 'Mã hợp đồng là bắt buộc',
});

export const reportIdValidation = z.coerce.number({
    required_error: 'Mã báo cáo là bắt buộc',
});

export const reportChildIdValidation = z.coerce.number({
    required_error: 'Mã báo cáo con là bắt buộc',
});

export const userIdValidation = z.string({
    required_error: 'Mã người dùng là bắt buộc',
});

export const reportTypeValidation = z.enum(['violation', 'incident'], {
    required_error: 'Loại báo cáo là bắt buộc',
});

export const reportPriorityValidation = z.enum(['low', 'medium', 'high'], {
    required_error: 'Mức độ ưu tiên là bắt buộc',
});

export const titleValidation = z.string({
    required_error: 'Tiêu đề là bắt buộc',
});

export const descriptionValidation = z.string({
    required_error: 'Mô tả là bắt buộc',
});

export const proposedValidation = z.string({
    required_error: 'Đề xuất là bắt buộc',
});

export const listStringOptional = z.array(z.string()).default([]);

export const compensationOptional = z.coerce.number().min(0, 'Tiền bồi thường phải lớn hơn hoặc bằng 0').optional();

export const resolvedAtValidation = z
    .string({
        required_error: 'Ngày giải quyết là bắt buộc',
    })
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'Định dạng ngày là DD/MM/YYYY' })
    .refine((date) => {
        const currentDate = new Date();
        const startDate = new Date(date);
        return {
            message: 'Ngày giải quyết phải lớn hơn hoặc bằng ngày hiện tại',
            success: startDate >= currentDate,
        };
    });
