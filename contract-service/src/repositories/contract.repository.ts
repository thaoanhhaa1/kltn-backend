import { Prisma, Status } from '@prisma/client';
import {
    ICancelContract,
    ICancelContractBeforeDeposit,
    ICreateContract,
    IFindContractByIdAndUser,
    IGetContractDetail,
    IGetContractInRange,
    IGetContractsByOwner,
    IGetContractsByRenter,
    IGetContractsTable,
} from '../interfaces/contract';
import { IGetTenantDistributionByAreaForOwner } from '../interfaces/dashboard';
import prisma from '../prisma/prismaClient';
import getDateAfter from '../utils/getDateAfter';

const getWhereFilterContracts = ({
    contractId,
    depositAmount,
    endDate,
    monthlyRent,
    propertyId,
    startDate,
    status,
    title,
}: IGetContractsTable) => ({
    ...(contractId && {
        contractId,
    }),
    ...(depositAmount && {
        depositAmount,
    }),
    ...(endDate && {
        endDateActual: endDate,
    }),
    ...(monthlyRent && {
        monthlyRent,
    }),
    ...(startDate && {
        startDate,
    }),
    ...(status && {
        status,
    }),
    ...(title && {
        property: {
            title: {
                contains: title,
                mode: 'insensitive',
            },
        },
    }),
    ...(propertyId && {
        propertyId,
    }),
});

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
            propertyJson: contract.propertyJson,
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

const orderByContractsByOwner = (sortField?: string, sortOrder?: string): any => {
    const order = sortOrder === 'ascend' ? 'asc' : 'desc';

    switch (sortField) {
        case 'contractId':
            return {
                contractId: order,
            };
        case 'title':
            return {
                property: {
                    title: order,
                },
            };
        case 'name':
            return {
                renter: {
                    name: order,
                },
            };
        case 'startDate':
            return {
                startDate: order,
            };
        case 'endDateActual':
            return {
                endDateActual: order,
            };
        case 'monthlyRent':
            return {
                monthlyRent: order,
            };
        case 'depositAmount':
            return {
                depositAmount: order,
            };
        case 'createdAt':
            return {
                createdAt: order,
            };
        case 'updatedAt':
            return {
                updatedAt: order,
            };
        case 'status':
            return {
                status: order,
            };
        default:
            return {
                createdAt: 'desc',
            };
    }
};

export const getContractsByOwner = ({ ownerId, renterId, sortOrder, sortField, ...rest }: IGetContractsByOwner) => {
    return prisma.contract.findMany({
        where: {
            ownerId,
            ...(renterId && {
                renterId,
            }),
            ...(getWhereFilterContracts(rest) as Prisma.ContractWhereInput),
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
        orderBy: orderByContractsByOwner(sortField, sortOrder),
        skip: rest.skip,
        take: rest.take,
    });
};

export const countContractsByOwner = ({ ownerId, renterId, ...rest }: IGetContractsByOwner) => {
    return prisma.contract.count({
        where: {
            ownerId,
            ...(renterId && {
                renterId,
            }),
            ...(getWhereFilterContracts(rest) as Prisma.ContractWhereInput),
        },
    });
};

const orderByContractsByRenter = (field?: string, order?: 'asc' | 'desc'): any => {
    switch (field) {
        case 'contractId':
            return {
                contractId: order,
            };
        case 'property':
            return {
                property: {
                    title: order,
                },
            };
        case 'startDate':
            return {
                startDate: order,
            };
        case 'monthlyRent':
            return {
                monthlyRent: order,
            };
        case 'depositAmount':
            return {
                depositAmount: order,
            };
        case 'status':
            return {
                status: order,
            };
        case 'createdAt':
            return {
                createdAt: order,
            };
        case 'updatedAt':
            return {
                updatedAt: order,
            };
        case 'endDateActual':
            return {
                endDateActual: order,
            };
        case 'owner':
            return {
                owner: {
                    name: order,
                },
            };
        default:
            return {
                createdAt: 'desc',
            };
    }
};

export const getContractsByRenter = ({ renterId, ownerId, order, field, ...rest }: IGetContractsByRenter) => {
    return prisma.contract.findMany({
        where: {
            renterId,
            ...(ownerId && {
                ownerId,
            }),
            ...(getWhereFilterContracts(rest) as Prisma.ContractWhereInput),
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
        orderBy: orderByContractsByRenter(field, order),
        skip: rest.skip,
        take: rest.take,
    });
};

export const countContractsByRenter = ({ renterId, ownerId, ...rest }: IGetContractsByRenter) => {
    return prisma.contract.count({
        where: {
            renterId,
            ...(ownerId && {
                ownerId,
            }),
            ...(getWhereFilterContracts(rest) as Prisma.ContractWhereInput),
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

export const getPropertiesByOwner = (ownerId: string) => {
    return prisma.contract
        .groupBy({
            by: ['propertyId'],
            where: {
                ownerId,
            },
        })
        .then((res) => {
            const propertyIds = res.map((item) => item.propertyId);

            return prisma.property.findMany({
                where: {
                    propertyId: {
                        in: propertyIds,
                    },
                },
                select: {
                    propertyId: true,
                    title: true,
                    slug: true,
                },
            });
        });
};

export const getPropertiesByRenter = (renterId: string) => {
    return prisma.contract
        .groupBy({
            by: ['propertyId'],
            where: {
                renterId,
            },
        })
        .then((res) => {
            const propertyIds = res.map((item) => item.propertyId);

            return prisma.property.findMany({
                where: {
                    propertyId: {
                        in: propertyIds,
                    },
                },
                select: {
                    propertyId: true,
                    title: true,
                    slug: true,
                },
            });
        });
};

export const getUsersByOwner = (ownerId: string) => {
    return prisma.contract
        .groupBy({
            by: ['renterId'],
            where: {
                ownerId,
            },
        })
        .then((res) => {
            const userIds = res.map((item) => item.renterId);

            return prisma.user.findMany({
                where: {
                    userId: {
                        in: userIds,
                    },
                },
                select: {
                    userId: true,
                    name: true,
                    email: true,
                },
            });
        });
};

export const getUsersByRenter = (renterId: string) => {
    return prisma.contract
        .groupBy({
            by: ['ownerId'],
            where: {
                renterId,
            },
        })
        .then((res) => {
            const userIds = res.map((item) => item.ownerId);

            return prisma.user.findMany({
                where: {
                    userId: {
                        in: userIds,
                    },
                },
                select: {
                    userId: true,
                    name: true,
                    email: true,
                },
            });
        });
};

export const getAvailableContract = (propertyId: string) => {
    return prisma.contract.findFirst({
        where: {
            propertyId,
            status: {
                notIn: ['ENDED', 'CANCELLED', 'OVERDUE'],
            },
        },
    });
};

export const getAvailableContractsBySlug = (slug: string) => {
    return prisma.contract.findMany({
        where: {
            property: {
                slug,
            },
            status: {
                notIn: ['ENDED', 'CANCELLED', 'OVERDUE', 'WAITING'],
            },
        },
        select: {
            startDate: true,
            endDateActual: true,
        },
        orderBy: {
            startDate: 'asc',
        },
    });
};
