export const USER_QUEUE = {
    name: 'user-service-user-queue',
    exchange: {
        name: 'user-service-exchange',
        type: 'fanout',
    },
    type: {
        CREATED: 'USER_CREATED',
        UPDATED: 'USER_UPDATED',
        DELETED: 'USER_DELETED',
    },
};
