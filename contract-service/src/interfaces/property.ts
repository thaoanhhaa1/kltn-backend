import { Address, Property } from '@prisma/client';

export type IProperty = Omit<Property, 'address_id'> & {
    address: Address;
};
