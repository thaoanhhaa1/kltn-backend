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

export const CONTRACT_QUEUE = {
    name: 'contract-service-property-queue',
    exchange: {
        name: 'contract-service-exchange',
        type: 'fanout',
    },
    type: {
        CREATED: 'PROPERTY_CREATED',
        UPDATED: 'PROPERTY_UPDATED',
        DELETED: 'PROPERTY_DELETED',
        UPDATE_STATUS: 'PROPERTY_UPDATE_STATUS',
    },
};

export const SYNC_MESSAGE_QUEUE = {
    name: 'sync-message-queue',
    type: {
        GET_CONTRACT_IN_RANGE: 'GET_CONTRACT_IN_RANGE',
    },
};

export const CREATE_CHAT_QUEUE = {
    name: 'create-chat-queue',
    type: {
        CREATE_CHAT: 'CREATE_CHAT',
    },
};
