import { User } from '@prisma/client';

interface UserBase {
    name: string | null;
    userId: string;
    avatar: string | null;
}

const getOtherUserInContract = ({ myId, owner, renter }: { owner: UserBase; renter: UserBase; myId: string }) => {
    return {
        user: myId === owner.userId ? owner : renter,
        otherUser: myId === owner.userId ? renter : owner,
    };
};

export default getOtherUserInContract;
