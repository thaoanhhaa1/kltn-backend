export const convertDateToDB = (date: Date | string) => {
    if (typeof date === 'string') {
        const [day, month, year] = date.split('/');
        return new Date(`${year}-${month}-${day}`).toISOString();
    }

    return new Date(date).toISOString();
};
