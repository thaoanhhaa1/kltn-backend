import { differenceInDays } from 'date-fns';

const isNotificationBefore30Days = (cancellationDate: Date): boolean => {
    const today = new Date();
    const daysDifference = differenceInDays(cancellationDate, today);
    return daysDifference >= 30;
};

export default isNotificationBefore30Days;
