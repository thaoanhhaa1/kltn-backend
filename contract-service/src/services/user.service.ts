import { User } from '@prisma/client';
import RabbitMQ from '../configs/rabbitmq.config';
import { SYNC_MESSAGE_QUEUE_CONTRACT } from '../constants/rabbitmq';
import { IUserId } from '../interfaces/user';
import { createUser, findUserById, updateUser } from '../repositories/user.repository';

export const createUserService = (user: User) => {
    return createUser(user);
};

export const updateUserService = (userId: IUserId, user: Omit<User, 'userId'>) => updateUser(userId, user);

export const findUserByIdService = (userId: IUserId) => {
    return findUserById(userId);
};

export const findUserDetailByUserIdService = async (userId: IUserId) => {
    const res = await RabbitMQ.getInstance().sendSyncMessage({
        queue: SYNC_MESSAGE_QUEUE_CONTRACT.name,
        message: {
            type: SYNC_MESSAGE_QUEUE_CONTRACT.type.GET_USER_DETAIL,
            data: userId,
        },
    });

    return JSON.parse(res);
};
