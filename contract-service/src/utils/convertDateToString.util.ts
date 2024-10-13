const convertDateToString = (date: Date | string, format: string = 'DD/MM/YYYY'): string => {
    if (typeof date === 'string') date = new Date(date);

    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return format
        .replace('DD', day.toString().padStart(2, '0'))
        .replace('MM', month.toString().padStart(2, '0'))
        .replace('YYYY', year.toString());
};

export default convertDateToString;
