import { addDays } from 'date-fns';
import { convertDateToDB } from './convertDate';

const getDateAfter = (date: Date, days: number): string => {
    return convertDateToDB(addDays(date, days).toISOString().substring(0, 10).split('-').reverse().join('/'));
};

export default getDateAfter;
