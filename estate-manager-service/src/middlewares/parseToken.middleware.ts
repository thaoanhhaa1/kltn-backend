import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt.util';

export interface JWTInput {
    id: string;
    email: string;
    userTypes: string[];
}

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        userTypes: string[];
    };
}

const parseTokenMiddleware = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) return next();

        const token = authHeader.split(' ')[1];

        const decoded = verifyToken(token);

        if (typeof decoded === 'string') return next();

        req.user = decoded as JWTInput;
        next();
    } catch (error) {
        return next();
    }
};

export default parseTokenMiddleware;
