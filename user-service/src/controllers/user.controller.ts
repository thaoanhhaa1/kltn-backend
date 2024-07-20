import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { findUserDTOByEmail } from '../repositories/user.repository';

export const getMyInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reqAuth = req as AuthenticatedRequest;

        const { email } = reqAuth.user!;

        const user = await findUserDTOByEmail(email);

        res.json(user);
    } catch (error) {
        next(error);
    }
};
