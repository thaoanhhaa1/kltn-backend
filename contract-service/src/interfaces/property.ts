import { Address, Property } from '@prisma/client';

export type IProperty = Omit<Property, 'addressId'> & {
    address: Address;
};
