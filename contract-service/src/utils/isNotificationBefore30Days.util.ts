import { differenceInDays } from 'date-fns';

const isNotificationBefore30Days = (cancellationDate: Date): boolean => {
    const today = new Date();
    const daysDifference = differenceInDays(cancellationDate, today);
    return daysDifference >= 30;
};

export default isNotificationBefore30Days;

export const isDateDifferenceMoreThan30Days = (date1: Date, date2: Date): boolean => {
    // set time to 0 to compare only date
    const date1WithoutTime = new Date(date1);
    date1WithoutTime.setHours(0, 0, 0, 0);
    const date2WithoutTime = new Date(date2);
    date2WithoutTime.setHours(0, 0, 0, 0);

    const daysDifference = differenceInDays(date1WithoutTime, date2WithoutTime);

    return daysDifference >= 30;
};
