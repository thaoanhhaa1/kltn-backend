import prisma from '../prisma/prismaClient';

export const getAddressIdsNotUse = (): Promise<
    Array<{
        address_id: string;
    }>
> => {
    return prisma.$queryRaw`
        select address_id from "\`address\`"
        where address_id not in (
            select  address_id from "\`property\`"
        )
    `;
};

export const deleteAddressByIds = (addressIds: Array<string>) => {
    return prisma.address.deleteMany({
        where: {
            addressId: {
                in: addressIds,
            },
        },
    });
};
