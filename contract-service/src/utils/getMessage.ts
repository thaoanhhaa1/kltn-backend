import { CreateContractReq } from '../schemas/contract.schema';

export const getOwnerCreateContractMessage = (data: CreateContractReq) => {
    const startDateFormat = new Date(data.startDate).toISOString().substring(0, 10);
    const endDateFormat = new Date(data.endDate).toISOString().substring(0, 10);

    return `Tạo hợp đồng thuê nhà với ${data.renterId} tại ${data.propertyId} từ ${startDateFormat} đến ${endDateFormat} với giá ${data.monthlyRent} và cọc ${data.depositAmount}`;
};
