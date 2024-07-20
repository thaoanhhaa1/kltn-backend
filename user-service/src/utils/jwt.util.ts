import jwt from 'jsonwebtoken';
import envConfig from '../configs/env.config';
import { JWTInput } from '../middlewares/auth.middleware';

export const generateAccessToken = (user: JWTInput) => {
    return jwt.sign(user, envConfig.JWT_ACCESS_SECRET!, {
        expiresIn: envConfig.JWT_ACCESS_EXPIRATION!,
    });
};

export const generateRefreshToken = (user: JWTInput) => {
    return jwt.sign(user, envConfig.JWT_REFRESH_SECRET!, {
        expiresIn: envConfig.JWT_REFRESH_EXPIRATION!,
    });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, envConfig.JWT_ACCESS_SECRET);
};

export const verifyRefreshToken = (token: string) => {
    return jwt.verify(token, envConfig.JWT_REFRESH_SECRET);
};
