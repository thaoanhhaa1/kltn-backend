import RabbitMQ from '../configs/rabbitmq.config';
import { SYNC_MESSAGE_QUEUE } from '../constants/rabbitmq';

export const getContractByIdService = async (params: { contractId: string; userId: string }) => {
    const result = await RabbitMQ.getInstance().sendSyncMessage({
        queue: SYNC_MESSAGE_QUEUE.name,
        message: {
            type: SYNC_MESSAGE_QUEUE.type.GET_CONTRACT_BY_ID,
            data: params,
        },
    });

    return JSON.parse(result);
};
