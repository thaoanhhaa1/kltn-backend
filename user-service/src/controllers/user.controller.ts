import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { getMyInfoService, getUsersService } from '../services/user.service';

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
