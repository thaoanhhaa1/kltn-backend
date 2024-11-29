import RabbitMQ from '../configs/rabbitmq.config';
import { SYNC_MESSAGE_QUEUE_CONTRACT } from '../constants/rabbitmq';
import { IProperty } from '../interfaces/property';
import { createProperty, softDeleteProperty, updateProperty } from '../repositories/property.repository';

export const createPropertyService = (property: IProperty) => {
    return createProperty(property);
};

export const softDeletePropertyService = (propertyId: string) => {
    return softDeleteProperty(propertyId);
};

export const updatePropertyService = (propertyId: string, property: Omit<IProperty, 'propertyId'>) => {
    return updateProperty(propertyId, property);
};

export const getPropertyBySlugService = async (slug: string) => {
    const res = await RabbitMQ.getInstance().sendSyncMessage({
        queue: SYNC_MESSAGE_QUEUE_CONTRACT.name,
        message: {
            type: SYNC_MESSAGE_QUEUE_CONTRACT.type.GET_PROPERTY_BY_SLUG,
            data: slug,
        },
    });

    return JSON.parse(res);
};

export const getPropertyByIdService = async (propertyId: string) => {
    const res = await RabbitMQ.getInstance().sendSyncMessage<any>({
        queue: SYNC_MESSAGE_QUEUE_CONTRACT.name,
        message: {
            type: SYNC_MESSAGE_QUEUE_CONTRACT.type.GET_PROPERTY_BY_ID,
            data: propertyId,
        },
    });

    return JSON.parse(res);
};

export const getPropertyDetailByIdService = async (propertyId: string) => {
    const property = await RabbitMQ.getInstance().sendSyncMessage({
        queue: SYNC_MESSAGE_QUEUE_CONTRACT.name,
        message: {
            type: SYNC_MESSAGE_QUEUE_CONTRACT.type.GET_PROPERTY_DETAIL,
            data: propertyId,
        },
    });

    return JSON.parse(property);
};
