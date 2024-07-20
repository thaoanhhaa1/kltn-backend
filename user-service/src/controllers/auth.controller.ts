import { NextFunction, Request, Response } from 'express';
import { loginSchema, registerSchema } from '../schemas/auth.schema';
import { loginUser, registerUser } from '../services/auth.service';
import convertZodIssueToEntryErrors from '../utils/convertZodIssueToEntryErrors.util';

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const safeParse = registerSchema.safeParse(req.body);

        if (!safeParse.success)
            throw convertZodIssueToEntryErrors({
                issue: safeParse.error.issues,
            });

        const token = await registerUser(safeParse.data);
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
