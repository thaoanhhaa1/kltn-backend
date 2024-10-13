import { Address } from '@prisma/client';

const convertAddress = (address: Omit<Address, 'addressId'>) =>
    `${address.street}, ${address.ward}, ${address.district}, ${address.city}`;

export default convertAddress;
