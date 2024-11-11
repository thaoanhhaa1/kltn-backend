import { subDays } from 'date-fns';
import { convertDateToDB } from './convertDate';

const getDateBefore = (date: Date, days: number): string => {
    return convertDateToDB(subDays(date, days).toISOString().substring(0, 10).split('-').reverse().join('/'));
};

export default getDateBefore;
