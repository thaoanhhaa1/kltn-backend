import jwt from 'jsonwebtoken';
import envConfig from '../configs/env.config';
import { JWTInput } from '../middlewares/auth.middleware';

export const verifyToken = (token: string) => {
    return jwt.verify(token, envConfig.JWT_ACCESS_SECRET);
};
