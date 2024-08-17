import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { RegisterInput } from '../schemas/auth.schema';

type RoleType = RegisterInput['userType'] | 'admin';

const roleMiddleware = (role: RoleType) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.userTypes.includes(role)) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden',
            statusCode: 403,
        });
    }

    next();
};

export default roleMiddleware;
