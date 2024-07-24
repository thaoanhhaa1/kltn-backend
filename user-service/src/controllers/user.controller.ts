import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { getMyInfoService } from '../services/user.service';

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
