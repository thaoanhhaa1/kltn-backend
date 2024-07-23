import { NextFunction, Request, Response } from 'express';
import RabbitMQ from '../configs/rabbitmq.config';
import { USER_QUEUE } from '../constants/rabbitmq';
import { loginSchema, registerSchema } from '../schemas/auth.schema';
import { loginUser, registerUser } from '../services/auth.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';

// FIXME Send OTP code

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const safeParse = registerSchema.safeParse(req.body);

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
            });

        const { token, user } = await registerUser(safeParse.data);

        RabbitMQ.getInstance().publishInQueue({
            data: user,
            type: USER_QUEUE.type.CREATED,
        });

        res.status(201).json({ token });
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
