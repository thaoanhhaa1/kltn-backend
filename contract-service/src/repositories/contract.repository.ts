import { Prisma, Status } from '@prisma/client';
import {
    ICancelContract,
    ICancelContractBeforeDeposit,
    ICreateContract,
    IFindContractByIdAndUser,
    IGetContractDetail,
    IGetContractInRange,
} from '../interfaces/contract';
import { IGetTenantDistributionByAreaForOwner } from '../interfaces/dashboard';
import { IPagination } from '../interfaces/pagination';
import { IUserId } from '../interfaces/user';
import prisma from '../prisma/prismaClient';
import getDateAfter from '../utils/getDateAfter';

export const createContract = (contract: ICreateContract) => {
    return prisma.contract.create({
        data: {
            contractId: contract.contractId,
            ownerId: contract.ownerId,
            renterId: contract.renterId,
            propertyId: contract.propertyId,
            startDate: contract.startDate,
            endDate: contract.endDate,
            endDateActual: contract.endDate,
            monthlyRent: contract.monthlyRent,
            depositAmount: contract.depositAmount,
            contractTerms: contract.contractTerms,
            status: Status.WAITING,
            transactionHashContract: contract.transactionHash,
        },
    });
};

export const findContractById = async (contractId: string) => {
    return prisma.contract.findUnique({
        where: { contractId: contractId, deleted: false },
    });
};

export const findContractByIdAndUser = async ({ contractId, userId }: IFindContractByIdAndUser) => {
    return prisma.contract.findUnique({
        where: { contractId: contractId, deleted: false, OR: [{ ownerId: userId }, { renterId: userId }] },
    });
};

export const deposit = (contractId: string) => {
    return prisma.contract.update({
        where: { contractId: contractId },
        data: {
            status: Status.DEPOSITED, // Cập nhật trạng thái hợp đồng thành ACCEPTED sau khi thanh toán
        },
    });
};

export const updateStatusContract = (contractId: string, status: Status, endDateActual?: Date) => {
    return prisma.contract.update({
        where: { contractId: contractId },
        data: { status, ...(endDateActual && { endDateActual }) },
        include: {
            owner: {
                select: {
                    avatar: true,
                    name: true,
                    userId: true,
                },
            },
            property: {
                select: {
                    title: true,
                },
            },
            renter: {
                select: {
                    avatar: true,
                    name: true,
                    userId: true,
                },
            },
        },
    });
};

export const payMonthlyRent = (contractId: string) => {
    return prisma.contract.update({
        where: { contractId: contractId },
        data: {
            status: Status.ONGOING,
        },
    });
};

// Hàm lấy chi tiết hợp đồng từ cơ sở dữ liệu
export const getContractDetail = async ({ contractId, userId, isAdmin }: IGetContractDetail): Promise<any> => {
    return prisma.contract.findUnique({
        where: {
            contractId,
            ...(!isAdmin && {
                OR: [
                    {
                        ownerId: userId,
                    },
                    {
                        renterId: userId,
                    },
                ],
            }),
        },
        include: {
            owner: {
                select: {
                    avatar: true,
                    name: true,
                    userId: true,
                    email: true,
                },
            },
            renter: {
                select: {
                    avatar: true,
                    name: true,
                    userId: true,
                    email: true,
                },
            },
            cancellationRequests: {
                where: {
                    deleted: false,
                    status: {
                        in: ['PENDING', 'REJECTED'],
                    },
                },
                orderBy: {
                    updatedAt: 'desc',
                },
                take: 1,
            },
        },
    });
};

export const getContractsByOwner = (ownerId: IUserId, { skip, take }: IPagination) => {
    return prisma.contract.findMany({
        where: {
            ownerId,
        },
        include: {
            renter: {
                select: {
                    avatar: true,
                    name: true,
                    userId: true,
                },
            },
            property: {
                select: {
                    title: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        skip,
        take,
    });
};

export const countContractsByOwner = (ownerId: IUserId) => {
    return prisma.contract.count({
        where: {
            ownerId,
        },
    });
};

export const getContractsByRenter = (renterId: IUserId, { skip, take }: IPagination) => {
    return prisma.contract.findMany({
        where: {
            renterId,
        },
        include: {
            owner: {
                select: {
                    avatar: true,
                    name: true,
                    userId: true,
                },
            },
            property: {
                select: {
                    title: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
        skip,
        take,
    });
};

export const countContractsByRenter = (renterId: IUserId) => {
    return prisma.contract.count({
        where: {
            renterId,
        },
    });
};

export const getContractForRentTransaction = () => {
    return prisma.contract.findMany({
        where: {
            status: {
                in: [
                    'APPROVED_CANCELLATION',
                    'DEPOSITED',
                    'UNILATERAL_CANCELLATION',
                    'REJECTED_CANCELLATION',
                    'PENDING_CANCELLATION',
                    'ONGOING',
                ],
            },
            deleted: false,
            startDate: {
                lte: new Date(),
            },
            endDateActual: {
                gte: new Date(),
            },
        },
    });
};

export const getContractInRange = ({ propertyId, rentalEndDate, rentalStartDate }: IGetContractInRange) => {
    return prisma.contract.findFirst({
        where: {
            status: {
                in: ['DEPOSITED', 'ONGOING'],
            },
            deleted: false,
            propertyId: propertyId,
            OR: [
                {
                    AND: [
                        {
                            startDate: {
                                gte: rentalStartDate,
                            },
                        },
                        {
                            startDate: {
                                lte: rentalEndDate,
                            },
                        },
                    ],
                },
                {
                    startDate: {
                        lt: rentalStartDate,
                    },
                    endDateActual: {
                        gte: rentalStartDate,
                    },
                },
            ],
        },
        select: {
            propertyId: true,
            startDate: true,
            endDateActual: true,
        },
    });
};

const getWhereCancelContracts = ({
    propertyId,
    rentalEndDate,
    rentalStartDate,
}: ICancelContract): Prisma.ContractWhereInput => ({
    status: 'WAITING',
    deleted: false,
    propertyId: propertyId,
    OR: [
        {
            AND: [
                {
                    startDate: {
                        gte: rentalStartDate,
                    },
                },
                {
                    startDate: {
                        lte: rentalEndDate,
                    },
                },
            ],
        },
        {
            startDate: {
                lt: rentalStartDate,
            },
            endDateActual: {
                gte: rentalStartDate,
            },
        },
    ],
});

export const findCancelContracts = (params: ICancelContract) => {
    return prisma.contract.findMany({
        where: getWhereCancelContracts(params),
        select: {
            contractId: true,
        },
    });
};

export const cancelContracts = (params: ICancelContract) => {
    return prisma.contract.updateMany({
        where: getWhereCancelContracts(params),
        data: {
            status: 'CANCELLED',
        },
    });
};

export const cancelContractBeforeDeposit = ({ contractId, userId }: ICancelContractBeforeDeposit) => {
    return prisma.contract.update({
        where: {
            contractId: contractId,
            OR: [
                {
                    renterId: userId,
                },
                {
                    ownerId: userId,
                },
            ],
        },
        data: {
            status: 'CANCELLED',
        },
    });
};

export const getContractById = ({ contractId, userId }: { contractId: string; userId?: string }) => {
    return prisma.contract.findUnique({
        where: {
            contractId: contractId,
            ...(userId && {
                OR: [
                    {
                        ownerId: userId,
                    },
                    {
                        renterId: userId,
                    },
                ],
            }),
        },
        include: {
            owner: true,
            renter: true,
        },
    });
};

export const updateEndDateActual = (contractId: string, endDateActual: Date) => {
    return prisma.contract.update({
        where: {
            contractId,
        },
        data: {
            endDateActual,
        },
    });
};

export const startedContract = () => {
    return prisma.contract.findMany({
        where: {
            status: 'DEPOSITED',
            deleted: false,
            startDate: {
                lte: new Date(),
            },
        },
    });
};

export const getTenantDistributionByAreaForOwner = (
    ownerId: string,
): Promise<Array<IGetTenantDistributionByAreaForOwner>> => {
    return prisma.$queryRaw`SELECT a.city, a.district, count(a.address_id) as count FROM "\`contract\`" as c
            JOIN "\`property\`" as p ON p.property_id = c.property_id 
            JOIN "\`address\`" as a ON a.address_id = p.address_id
        where C.owner_user_id = ${ownerId}
        GROUP BY a.city, a.district
        ORDER BY a.city, a.district;
    `;
};

export const getEndContract = () => {
    return prisma.contract.findMany({
        where: {
            status: 'ONGOING',
            deleted: false,
            endDateActual: {
                lte: new Date(),
            },
        },
    });
};

export const countContractByStatus = () => {
    return prisma.contract.groupBy({
        by: ['status'],
        _count: {
            status: true,
        },
    });
};

export const getRemindEndContracts = () => {
    const now = new Date();
    const after15Days = getDateAfter(now, 15);
    const after30Days = getDateAfter(now, 30);
    const after45Days = getDateAfter(now, 45);

    return prisma.contract.findMany({
        where: {
            status: {
                in: [
                    'APPROVED_CANCELLATION',
                    'ONGOING',
                    'PENDING_CANCELLATION',
                    'REJECTED_CANCELLATION',
                    'UNILATERAL_CANCELLATION',
                ],
            },
            deleted: false,
            endDateActual: {
                in: [after15Days, after30Days, after45Days],
            },
        },
        select: {
            contractId: true,
            endDateActual: true,
            renterId: true,
        },
    });
};
