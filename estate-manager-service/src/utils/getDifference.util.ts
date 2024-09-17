const getDifference = (startDate: Date, endDate: Date) => {
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endMonth = endDate.getMonth();

    const yearDifference = endYear - startYear;
    const monthDifference = endMonth - startMonth + yearDifference * 12;

    if (monthDifference % 12 === 0) {
        const years = Math.floor(monthDifference / 12);
        return `${years} năm`;
    }

    return `${monthDifference} tháng`;
};

export default getDifference;
