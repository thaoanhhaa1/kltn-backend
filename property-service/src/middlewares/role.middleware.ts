import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

type RoleType = 'admin' | 'renter' | 'owner';

const roleMiddleware = (role: RoleType) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.userType !== role) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden',
            statusCode: 403,
        });
    }

    next();
};

export default roleMiddleware;
