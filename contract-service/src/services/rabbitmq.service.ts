import RabbitMQ from '../configs/rabbitmq.config';
import { CONTRACT_QUEUE } from '../constants/rabbitmq';
import { ICreateNotification } from '../interfaces/notification';

export const createNotificationQueue = (notification: ICreateNotification) => {
    return RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
        data: notification,
        type: CONTRACT_QUEUE.type.NOTIFICATION_CREATED,
    });
};
