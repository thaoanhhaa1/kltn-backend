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

export const PROPERTY_QUEUE = {
    name: 'property-service-property-queue',
    exchange: {
        name: 'property-service-exchange',
        type: 'fanout',
    },
    type: {
        CREATED: 'PROPERTY_CREATED',
        UPDATED: 'PROPERTY_UPDATED',
        DELETED: 'PROPERTY_DELETED',
    },
};
