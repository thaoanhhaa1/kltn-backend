export const dateAfter = (days: number, atMidNight: boolean) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    if (atMidNight) date.setHours(0, 0, 0, 0);
    return date;
};
