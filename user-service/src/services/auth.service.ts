import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail } from '../repositories/user.repository';
import { LoginInput, RegisterInput } from '../schemas/auth.schema';
import CustomError, { EntryError } from '../utils/error.util';
import { generateAccessToken } from '../utils/jwt.util';

export const registerUser = async ({ email, name, password, userType }: Omit<RegisterInput, 'otp'>) => {
    const existingUser = await findUserByEmail(email);
    if (existingUser) throw new CustomError(400, 'User already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await createUser({
        email,
        name,
        password: hashedPassword,
        userType,
    });

    return {
        user: newUser,
        token: generateAccessToken({
            id: newUser.user_id,
            email: newUser.email,
            userTypes: newUser.user_types,
        }),
    };
};

export const loginUser = async ({ email, password }: LoginInput) => {
    const user = await findUserByEmail(email);
    if (!user)
        throw new EntryError(404, 'User not found', [
            {
                field: 'email',
                error: 'User not found',
            },
        ]);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
        throw new EntryError(400, 'Invalid password', [
            {
                field: 'password',
                error: 'Invalid password',
            },
        ]);

    return generateAccessToken({
        id: user.user_id,
        email: user.email,
        userTypes: user.user_types,
    });
};
