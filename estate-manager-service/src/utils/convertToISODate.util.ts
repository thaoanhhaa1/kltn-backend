export const convertToISODate = (date: string): string => {
    return new Date(date).toISOString();
};
