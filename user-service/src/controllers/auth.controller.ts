import { NextFunction, Request, Response } from 'express';
import RabbitMQ from '../configs/rabbitmq.config';
import { USER_QUEUE } from '../constants/rabbitmq';
import { loginSchema, registerSchema } from '../schemas/auth.schema';
import { loginUser, registerUser } from '../services/auth.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';
import otp from '../configs/otp.config';
import sendEmail from '../configs/email.config';
import { ResponseType } from '../types/response.type';
import envConfig from '../configs/env.config';
import { isExistingUser } from '../services/user.service';
import { EntryError } from '../utils/error.util';
import { otpSchema } from '../schemas/otp.schema';
import Redis from '../configs/redis.config';

export const otpRegister = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const safeParse = otpSchema.safeParse(req.body);

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
            });

        const email = safeParse.data.email;
        const existingUser = await isExistingUser(email);

        if (existingUser)
            throw new EntryError(400, 'User already exists', [
                {
                    field: 'email',
                    error: 'User already exists',
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

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const safeParse = registerSchema.safeParse(req.body);

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
            });

        const otp = await Redis.getInstance().getClient().get(`otp:${safeParse.data.email}`);

        if (String(otp) !== safeParse.data.otp)
            throw new EntryError(400, 'Invalid OTP', [
                {
                    field: 'otp',
                    error: 'Invalid OTP',
                },
            ]);

        const { accessToken, freshToken, user } = await registerUser(safeParse.data);

        RabbitMQ.getInstance().publishInQueue({
            message: {
                data: user,
                type: USER_QUEUE.type.CREATED,
            },
            exchange: USER_QUEUE.exchange,
            name: USER_QUEUE.name,
        });

        res.status(201).json({ accessToken, freshToken });
    } catch (error) {
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const safeParse = loginSchema.safeParse(req.body);

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
            });

        const token = await loginUser(safeParse.data);
        res.status(200).json({ token });
    } catch (error) {
        next(error);
    }
};
