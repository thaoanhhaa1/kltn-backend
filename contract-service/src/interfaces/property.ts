import { Address, Property } from '@prisma/client';

export type IProperty = Property & {
    address: Address;
};
