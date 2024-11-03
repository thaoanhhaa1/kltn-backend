import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail } from '../repositories/user.repository';
import { LoginInput, RegisterInput } from '../schemas/auth.schema';
import CustomError, { EntryError } from '../utils/error.util';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.util';
import envConfig from '../configs/env.config';
import { JWTInput } from '../middlewares/auth.middleware';

const getTokens = (user: JWTInput) => {
    return {
        accessToken: {
            token: generateAccessToken(user),
            expiresIn: envConfig.JWT_ACCESS_EXPIRATION,
        },
        refreshToken: {
            token: generateRefreshToken(user),
            expiresIn: envConfig.JWT_REFRESH_EXPIRATION,
        },
    };
};

export const registerUser = async ({ email, name, password, userType }: Omit<RegisterInput, 'otp'>) => {
    const existingUser = await findUserByEmail(email);
    if (existingUser) throw new CustomError(400, 'Email đã được sử dụng');

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await createUser({
        email,
        name,
        password: hashedPassword,
        userType,
    });

    return {
        user: newUser,
        token: getTokens({
            id: newUser.userId,
            email: newUser.email,
            userTypes: newUser.userTypes,
        }),
    };
};

export const loginUser = async ({ email, password }: LoginInput) => {
    const user = await findUserByEmail(email);
    if (!user)
        throw new EntryError(404, 'Không tìm thấy người dùng', [
            {
                field: 'email',
                error: 'Không tìm thấy người dùng',
            },
        ]);

    if (user.status === 'BLOCKED') throw new CustomError(403, 'Bạn đã bị khóa tài khoản');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
        throw new EntryError(400, 'Mật khẩu không đúng', [
            {
                field: 'password',
                error: 'Mật khẩu không đúng',
            },
        ]);

    return getTokens({
        id: user.userId,
        email: user.email,
        userTypes: user.userTypes,
    });
};
