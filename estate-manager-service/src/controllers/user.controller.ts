import { NextFunction, Request, Response } from 'express';
import sendEmail from '../configs/email.config';
import envConfig from '../configs/env.config';
import otp from '../configs/otp.config';
import RabbitMQ from '../configs/rabbitmq.config';
import Redis from '../configs/redis.config';
import { USER_QUEUE } from '../constants/rabbitmq';
import { IVerifyRequest } from '../interface/user';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { otpSchema } from '../schemas/otp.schema';
import { forgotPasswordSchema, updatePasswordSchema, updateSchema } from '../schemas/user.schema';
import { verifyIDCard } from '../services/fpt.service';
import {
    blockUserService,
    forgotPasswordService,
    getAllOwnersCbbService,
    getMyInfoService,
    getUsersService,
    isExistingUser,
    updatePasswordService,
    updateUserService,
    updateWalletAddressService,
    verifyUserService,
} from '../services/user.service';
import { ResponseType } from '../types/response.type';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';
import CustomError, { EntryError } from '../utils/error.util';
import { uploadFile } from '../utils/uploadToFirebase.util';

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
            statusCode: 200,
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

        const userRedis = await Redis.getInstance().getClient().get(`user:${email}`);
        console.log('🚀 ~ getMyInfo ~ userRedis:', userRedis);

        if (userRedis) return res.json(userRedis);

        const user = await getMyInfoService(email);

        await Redis.getInstance().getClient().set(`user:${email}`, JSON.stringify(user), {
            type: 'string',
        });

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

        RabbitMQ.getInstance().publishInQueue({
            exchange: USER_QUEUE.exchange,
            name: USER_QUEUE.name,
            message: {
                data: updatedUser,
                type: USER_QUEUE.type.UPDATED,
            },
        });
        Redis.getInstance().getClient().del(`user:${reqAuth.user!.email}`);

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
            statusCode: 200,
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
            statusCode: 200,
            success: true,
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
};

export const getAllOwnersCbb = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const owners = await getAllOwnersCbbService();

        res.json(owners);
    } catch (error) {
        next(error);
    }
};

export const updateWalletAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reqAuth = req as AuthenticatedRequest;
        const userId = reqAuth.user!.id;
        const { walletAddress } = req.body;

        if (!walletAddress) throw new CustomError(400, 'Địa chỉ ví không được để trống');

        if (!walletAddress.startsWith('0x') && walletAddress.length !== 42)
            throw new CustomError(400, 'Địa chỉ ví không hợp lệ');

        const user = await updateWalletAddressService(userId, walletAddress);

        RabbitMQ.getInstance().publishInQueue({
            exchange: USER_QUEUE.exchange,
            name: USER_QUEUE.name,
            message: {
                data: user,
                type: USER_QUEUE.type.UPDATED,
            },
        });
        Redis.getInstance().getClient().del(`user:${reqAuth.user!.email}`);

        const response: ResponseType = {
            message: 'Địa chỉ ví đã được cập nhật',
            statusCode: 200,
            success: true,
        };

        res.json(response);
    } catch (error) {
        next(error);
    }
};

export const verifyUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const cards = req.files;
        const { front, back } = cards as { [fieldName: string]: Express.Multer.File[] };
        const fontImage = front[0];
        const backImage = back[0];

        const [frontRes, backRes, frontUrl, backUrl] = await Promise.all([
            verifyIDCard(fontImage),
            verifyIDCard(backImage),
            uploadFile({
                file: fontImage,
                folder: 'user-service',
            }),
            uploadFile({
                file: backImage,
                folder: 'user-service',
            }),
        ]);
        const frontData = frontRes.data[0];
        const backData = backRes.data[0];

        if (!frontData.name) throw new CustomError(400, 'Ảnh mặt trước không hợp lệ');
        if (!backData.issue_date) throw new CustomError(400, 'Ảnh mặt sau không hợp lệ');

        const userData: IVerifyRequest = {
            name: frontData.name,
            address: {
                city: frontData.address_entities.province,
                district: frontData.address_entities.district,
                street: frontData.address_entities.street,
                ward: frontData.address_entities.ward,
            },
            cardId: frontData.id,
            doe: frontData.doe,
            issueDate: backData.issue_date,
            issueLoc: backData.issue_loc,
            idCardBack: backUrl,
            idCardFront: frontUrl,
        };

        const result = await verifyUserService(userId, userData);

        RabbitMQ.getInstance().publishInQueue({
            exchange: USER_QUEUE.exchange,
            name: USER_QUEUE.name,
            message: {
                data: result,
                type: USER_QUEUE.type.UPDATED,
            },
        });
        Redis.getInstance().getClient().del(`user:${req.user!.email}`);

        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const blockUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.body;
        const user = await blockUserService(id);

        RabbitMQ.getInstance().publishInQueue({
            exchange: USER_QUEUE.exchange,
            name: USER_QUEUE.name,
            message: {
                data: user,
                type: USER_QUEUE.type.UPDATED,
            },
        });

        res.json(user);
    } catch (error) {
        next(error);
    }
};
