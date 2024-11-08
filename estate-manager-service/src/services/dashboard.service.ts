import {
    ICountNewUsersByTypeAndMonth,
    ICountPropertyByCityAndDistrict,
    ICountPropertyByType,
} from '../interface/dashboard';
import {
    countPropertiesByCityAndDistrict,
    countPropertiesByStatus,
    countPropertiesByType,
    countPropertiesByUser,
    countUnavailablePropertiesByUser,
} from '../repositories/property.repository';
import {
    countNewUsersByMonth,
    countNewUsersByTypeAndMonth,
    countUsersByType,
    findOwnerId,
} from '../repositories/user.repository';
import CustomError from '../utils/error.util';

export const getOverviewByOwnerService = async (ownerId: string) => {
    const [user, countProperties, countUnavailableProperties] = await Promise.all([
        findOwnerId(ownerId),
        countPropertiesByUser(ownerId),
        countUnavailablePropertiesByUser(ownerId),
    ]);

    if (!user) throw new CustomError(404, 'Không tìm thấy người dùng');

    return {
        countProperties,
        countUnavailableProperties,
    };
};

export const getOverviewByAdminService = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [countUsersByTypeRes, countNewUsersInMonth, overviewProperties] = await Promise.all([
        countUsersByType(),
        countNewUsersByMonth(month, year),
        countPropertiesByStatus(),
    ]);

    let avgPrice: number = 0;
    let totalProperties: number = 0;
    const countPropertiesByStatusRes = overviewProperties.map((item) => {
        totalProperties += item._count.status;
        avgPrice += item._avg.price ?? 0;
        return {
            status: item.status,
            count: item._count.status,
        };
    });

    return {
        usersByType: countUsersByTypeRes,
        newUsersInMonth: countNewUsersInMonth._count,
        propertiesByStatus: countPropertiesByStatusRes,
        avgPrice: avgPrice / totalProperties,
    };
};

export const countNewUsersByTypeAndMonthService = async () => {
    const now = new Date();
    const year = now.getFullYear();

    const res = await countNewUsersByTypeAndMonth(year);
    const data = JSON.parse(JSON.stringify(res)) as ICountNewUsersByTypeAndMonth[];

    const base = {
        renter: 0,
        owner: 0,
    };

    return data.reduce((acc, item) => {
        const prev = acc.at(-1);

        if (!prev) return [{ ...base, [item.userType]: item.count, month: item.month }];

        if (prev.month === item.month)
            return [
                ...acc.slice(0, -1),
                {
                    ...prev,
                    [item.userType]: item.count,
                },
            ];

        return [...acc, { ...base, [item.userType]: item.count, month: item.month }];
    }, [] as any[]);
};

export const countPropertiesByTypeService = async () => {
    const res = await countPropertiesByType();
    const data = JSON.parse(JSON.stringify(res)) as Array<ICountPropertyByType>;

    return data.map((item) => ({
        type: item._id.name,
        count: item.count,
        avgPrice: item.avgPrice,
    }));
};

export const countPropertiesByCityAndDistrictService = async () => {
    const res = await countPropertiesByCityAndDistrict();
    const data = JSON.parse(JSON.stringify(res)) as Array<ICountPropertyByCityAndDistrict>;

    return data.map((item) => ({
        city: item._id.city,
        district: item._id.district,
        count: item.count,
    }));
};
