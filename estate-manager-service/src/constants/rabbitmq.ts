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
        NOTIFICATION_CREATED: 'NOTIFICATION_CREATED',
    },
};

export const SYNC_MESSAGE_QUEUE = {
    name: 'sync-message-queue',
    type: {
        GET_CONTRACT_IN_RANGE: 'GET_CONTRACT_IN_RANGE',
        GET_CONTRACT_BY_ID: 'GET_CONTRACT_BY_ID',
        GET_AVAILABLE_CONTRACT: 'GET_AVAILABLE_CONTRACT',
    },
};

export const SYNC_MESSAGE_QUEUE_CONTRACT = {
    name: 'sync-message-queue-contract',
    type: {
        GET_PROPERTY_DETAIL: 'GET_PROPERTY_DETAIL',
        GET_USER_DETAIL: 'GET_USER_DETAIL',
        GET_PROPERTY_BY_SLUG: 'GET_PROPERTY_BY_SLUG',
        GET_PROPERTY_BY_ID: 'GET_PROPERTY_BY_ID',
    },
};

export const CREATE_CHAT_QUEUE = {
    name: 'conversation-queue',
    type: {
        CREATE_CHAT: 'CREATE_CHAT',
        READ_CHAT: 'READ_CHAT',
        BLOCK_USER: 'BLOCK_USER',
    },
};

export const INTERNAL_ESTATE_MANAGER_QUEUE = {
    name: 'internal-estate-manager-queue',
    type: {
        CREATE_NOTIFICATION: 'CREATE_NOTIFICATION',
    },
};
