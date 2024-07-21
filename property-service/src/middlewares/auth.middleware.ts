import { NextFunction, Request, Response } from 'express';
import { ResponseError } from '../types/error.type';
import CustomError from '../utils/error.util';
import { verifyToken } from '../utils/jwt.util';

export interface JWTInput {
    id: number;
    email: string;
    userType: string;
}

export interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        email: string;
        userType: string;
    };
}

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            throw new CustomError(401, 'No token provided');
        }

        const token = authHeader.split(' ')[1];

        const decoded = verifyToken(token);

        if (typeof decoded === 'string') throw new CustomError(401, decoded);

        req.user = decoded as JWTInput;
        next();
    } catch (error) {
        const responseError: ResponseError = {
            message: 'Internal Server Error',
            status: 500,
            success: false,
        };

        if (error instanceof Error) {
            responseError.message = error.message;
            responseError.status = 401;
        }

        return res.status(responseError.status).json(responseError);
    }
};

export default authMiddleware;
