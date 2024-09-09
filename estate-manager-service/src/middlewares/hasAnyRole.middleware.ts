import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

export type RoleType = 'admin' | 'renter' | 'owner';

const hasAnyRoleMiddleware = (roles: RoleType[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!roles.some((role) => req.user?.userTypes.includes(role))) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden',
            statusCode: 403,
        });
    }

    next();
};

export default hasAnyRoleMiddleware;
