import { IUserId } from '../interface/user';

const createChatConversation = (firstUser: IUserId, secondUser: IUserId) => {
    if (firstUser < secondUser) return `${firstUser}-${secondUser}`;

    return `${secondUser}-${firstUser}`;
};

export default createChatConversation;
