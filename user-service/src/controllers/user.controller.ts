import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { forgotPasswordSchema, updatePasswordSchema, updateSchema } from '../schemas/user.schema';
import {
    forgotPasswordService,
    getMyInfoService,
    getUsersService,
    isExistingUser,
    updatePasswordService,
    updateUserService,
} from '../services/user.service';
import { ResponseType } from '../types/response.type';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';
import { uploadFile } from '../utils/uploadToFirebase.util';
import { otpSchema } from '../schemas/otp.schema';
import { EntryError } from '../utils/error.util';
import otp from '../configs/otp.config';
import sendEmail from '../configs/email.config';
import envConfig from '../configs/env.config';
import Redis from '../configs/redis.config';

export const otpToUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const safeParse = otpSchema.safeParse(req.body);

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
            });

        const email = safeParse.data.email;
        const existingUser = await isExistingUser(email);

        if (!existingUser)
            throw new EntryError(400, 'Bad request', [
                {
                    field: 'email',
                    error: 'Email not found',
                },
            ]);

        const otpCode = otp.generate();

        await sendEmail({
            receiver: email,
            locals: {
                appLink: envConfig.FE_URL,
                OTP: otpCode,
                title: 'OTP Verification',
            },
            subject: 'OTP Verification',
            template: 'verifyEmail',
        });
        await Redis.getInstance().getClient().set(`otp:${email}`, otpCode, {
            ex: envConfig.OTP_EXPIRATION,
            type: 'string',
        });

        // FIXME: Remove this line in production
        console.log(`OTP: ${otpCode}`);

        const dataResponse: ResponseType = {
            status: 200,
            message: 'OTP sent successfully',
            success: true,
        };

        res.status(200).json(dataResponse);
    } catch (error) {
        next(error);
    }
};

export const getMyInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reqAuth = req as AuthenticatedRequest;

        const { email } = reqAuth.user!;

        const user = await getMyInfoService(email);

        res.json(user);
    } catch (error) {
        next(error);
    }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const take = Number(req.query.take) || 10;
        const skip = Number(req.query.skip) || 0;

        const users = await getUsersService({
            skip,
            take,
        });

        res.json(users);
    } catch (error) {
        next(error);
    }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reqAuth = req as AuthenticatedRequest;
        const userId = reqAuth.user!.id;
        const avatar = req.file;
        let avatarUrl: string | undefined;

        if (avatar)
            avatarUrl = await uploadFile({
                file: avatar,
                folder: 'user-service',
            });

        const safeParse = updateSchema.safeParse(req.body);

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
                message: 'Invalid input',
                status: 400,
            });

        const updatedUser = await updateUserService(userId, {
            ...safeParse.data,
            avatar: avatarUrl,
        });

        res.json(updatedUser);
    } catch (error) {
        next(error);
    }
};

export const updatePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const safeParse = updatePasswordSchema.safeParse(req.body);

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
                message: 'Invalid input',
                status: 400,
            });

        await updatePasswordService(userId, safeParse.data);
        const response: ResponseType = {
            message: 'Password updated successfully',
            status: 200,
            success: true,
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const safeParse = forgotPasswordSchema.safeParse(req.body);

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
                message: 'Invalid input',
                status: 400,
            });

        await forgotPasswordService(safeParse.data);

        const response: ResponseType = {
            message: 'Password updated successfully',
            status: 200,
            success: true,
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
};
