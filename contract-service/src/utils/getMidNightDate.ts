const getMidNightDate = (date: Date, isGMT?: boolean) => {
    const midNightDate = new Date(date);

    if (isGMT) {
        midNightDate.setHours(7, 0, 0, 0);
        return midNightDate;
    }

    midNightDate.setHours(0, 0, 0, 0);
    return midNightDate;
};

export default getMidNightDate;
