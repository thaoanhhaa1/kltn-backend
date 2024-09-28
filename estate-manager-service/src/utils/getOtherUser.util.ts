import { UserBaseEmbed } from '@prisma/client';
import { IUserId } from '../interface/user';

export const getOtherUser = (users: UserBaseEmbed[], userId: IUserId) => {
    return users.find((user) => user.userId !== userId);
};
