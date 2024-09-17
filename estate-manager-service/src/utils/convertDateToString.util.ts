const convertDateToString = (date: Date, format: string = 'DD/MM/YYYY'): string => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return format
        .replace('DD', day.toString().padStart(2, '0'))
        .replace('MM', month.toString().padStart(2, '0'))
        .replace('YYYY', year.toString());
};

export default convertDateToString;
