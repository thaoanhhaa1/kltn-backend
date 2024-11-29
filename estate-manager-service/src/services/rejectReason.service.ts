import { getRejectReasonsByPropertyId } from '../repositories/rejectReason.repository';

export const getRejectReasonsByPropertyIdService = (propertyId: string) => {
    return getRejectReasonsByPropertyId(propertyId);
};
