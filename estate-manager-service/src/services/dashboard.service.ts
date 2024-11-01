import { countPropertiesByUser, countUnavailablePropertiesByUser } from '../repositories/property.repository';
import { findOwnerId } from '../repositories/user.repository';
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
