import { Address } from '@prisma/client';

const convertAddress = (address: Address) => `${address.street}, ${address.ward}, ${address.district}, ${address.city}`;

export default convertAddress;
