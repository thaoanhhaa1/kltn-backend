import { Prisma, Contract as PrismaContract, PropertyStatus, Status } from '@prisma/client';
import { addDays, isAfter, isSameDay } from 'date-fns';
import RentalContractABI from '../../contractRental/build/contracts/RentalContract.json'; // ABI của hợp đồng
import envConfig from '../configs/env.config';
import RabbitMQ from '../configs/rabbitmq.config';
import web3 from '../configs/web3.config';
import { CONTRACT_QUEUE } from '../constants/rabbitmq';
import {
    ICancelContract,
    ICancelContractBeforeDeposit,
    ICreateContract,
    IFindContractByIdAndUser,
    IGetContractDetail,
    IGetContractInRange,
} from '../interfaces/contract';
import { IPagination } from '../interfaces/pagination';
import { IUserId } from '../interfaces/user';
import prisma from '../prisma/prismaClient';
import convertVNDToWei from '../utils/convertVNDToWei.util';
import isNotificationBefore30Days from '../utils/isNotificationBefore30Days.util';

const contractAddress = envConfig.RENTAL_CONTRACT_ADDRESS;

// Kiểm tra tính hợp lệ của địa chỉ hợp đồng
if (!web3.utils.isAddress(contractAddress)) {
    throw new Error('Invalid contract address.');
}

const rentalContract = new web3.eth.Contract(RentalContractABI.abi as any, contractAddress);

export const createContract = (contract: ICreateContract) => {
    return prisma.contract.create({
        data: {
            contractId: contract.contractId,
            ownerId: contract.ownerId,
            renterId: contract.renterId,
            propertyId: contract.propertyId,
            startDate: contract.startDate,
            endDate: contract.endDate,
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

export const updateStatusContract = (contractId: string, status: Status) => {
    return prisma.contract.update({
        where: { contractId: contractId },
        data: { status },
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

// !
export const cancelContractByOwner = async (
    contractId: string,
    ownerUserId: string,
    cancellationDate: Date,
): Promise<PrismaContract> => {
    try {
        // Lấy thông tin hợp đồng từ cơ sở dữ liệu
        const contract = await prisma.contract.findUnique({
            where: { contractId: contractId },
        });

        if (!contract) {
            throw new Error('Contract not found.');
        }

        // Xác định thông báo trước 30 ngày
        const notifyBefore30Days = isNotificationBefore30Days(cancellationDate);

        // Lấy thông tin người chủ từ cơ sở dữ liệu
        const owner = await prisma.user.findUnique({
            where: { userId: ownerUserId },
        });

        if (!owner || !owner.walletAddress) {
            throw new Error('Owner not found or does not have a wallet address.');
        }

        const ownerAddress = owner.walletAddress.toLowerCase();

        // Lấy thông tin hợp đồng từ hợp đồng thông minh
        const rental: any = await rentalContract.methods.getContractDetails(contractId).call({
            from: ownerAddress,
        });

        console.log(`Contract details on blockchain: `, rental);

        // Kiểm tra xem ownerAddress có trùng với owner trên hợp đồng không
        if (ownerAddress.toLowerCase() !== rental.owner.toLowerCase()) {
            throw new Error('Owner address mismatch.');
        }

        // Chuyển đổi trạng thái hợp đồng thành số nguyên
        const rentalStatus = parseInt(rental.status, 10);

        // Kiểm tra trạng thái hợp đồng trước khi thực hiện hành động
        if (rentalStatus === 3) {
            // Assuming 3 is for Ended status
            throw new Error('Contract has already ended.');
        }

        let compensation = 0;
        let depositAmount = 0;

        // Xác định số tiền bồi thường và tiền cọc cần hoàn trả
        if (!notifyBefore30Days) {
            compensation = Number(await convertVNDToWei(Number(rental.monthlyRent)));
        }

        if (contract.status === 'DEPOSITED' || contract.status === 'ONGOING') {
            depositAmount = Number(await convertVNDToWei(Number(rental.depositAmount)));
        }

        // Ước lượng gas cho việc hủy hợp đồng
        const gasEstimate = await rentalContract.methods
            .cancelContractByOwner(contractId, notifyBefore30Days)
            .estimateGas({
                from: ownerAddress,
                value: web3.utils.toWei((compensation + depositAmount).toString(), 'wei'), // Tổng giá trị cần gửi
            });

        // Gọi hàm cancelContractByOwner trên smart contract
        const receipt = await rentalContract.methods.cancelContractByOwner(contractId, notifyBefore30Days).send({
            from: ownerAddress,
            value: web3.utils.toWei((compensation + depositAmount).toString(), 'wei'),
            gas: gasEstimate.toString(),
            gasPrice: web3.utils.toWei('30', 'gwei').toString(),
        });

        // Ghi nhận giao dịch
        await prisma.transaction.create({
            data: {
                contractId: contractId,
                amount: compensation + depositAmount,
                transactionHash: receipt.transactionHash,
                status: 'COMPLETED',
                title: notifyBefore30Days ? 'Contract cancellation' : 'Contract cancellation with compensation',
            },
        });

        // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
        const updatedContract = await prisma.contract.update({
            where: { contractId: contractId },
            data: {
                status: Status.ENDED,
                updatedAt: new Date(),
            },
        });

        // Cập nhật trạng thái property trong cơ sở dữ liệu
        await prisma.property.update({
            where: { propertyId: contract.propertyId },
            data: {
                status: PropertyStatus.ACTIVE, // Hoặc trạng thái phù hợp với yêu cầu của bạn
            },
        });

        RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
            data: {
                propertyId: contract.propertyId,
                status: PropertyStatus.ACTIVE,
            },
            type: CONTRACT_QUEUE.type.UPDATE_STATUS,
        });

        return updatedContract;
    } catch (error) {
        console.error('Error in cancelContractByOwner:', error);
        throw error;
    }
};

// !
export const endContract = async (contractId: string, userId: string): Promise<any> => {
    try {
        // Lấy thông tin hợp đồng từ cơ sở dữ liệu
        const contract = await prisma.contract.findUnique({
            where: { contractId: contractId },
        });

        if (!contract) {
            throw new Error('Contract not found.');
        }

        // Lấy thông tin người dùng từ cơ sở dữ liệu
        const user = await prisma.user.findUnique({
            where: { userId: userId },
        });

        if (!user || !user.walletAddress) {
            throw new Error('User not found or does not have a wallet address.');
        }

        const userAddress = user.walletAddress.toLowerCase();

        // Lấy thông tin chi tiết hợp đồng từ hợp đồng thông minh
        const rental: any = await rentalContract.methods.getContractDetails(contractId).call({
            from: userAddress,
        });

        // Chuyển đổi trạng thái hợp đồng thành số nguyên
        const rentalStatus = parseInt(rental.status, 10);

        // Log trạng thái hợp đồng
        console.log('Rental status:', rentalStatus);

        if (rentalStatus === 0) {
            // NotCreated
            const threeDaysAfterCreation = addDays(new Date(contract.createdAt), 3);
            const currentDate = new Date();

            // Log ngày hiện tại và ngày ba ngày sau khi tạo hợp đồng
            console.log('Current date:', currentDate);
            console.log('Three days after creation:', threeDaysAfterCreation);

            if (isAfter(currentDate, threeDaysAfterCreation)) {
                // Thay đổi trạng thái hợp đồng thành Ended
                const receipt = await rentalContract.methods.endContract(contractId).send({
                    from: userAddress,
                    gas: '3000000',
                    gasPrice: web3.utils.toWei('30', 'gwei').toString(),
                });

                // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
                const updatedContract = await prisma.contract.update({
                    where: { contractId: contractId },
                    data: {
                        status: Status.ENDED,
                        updatedAt: new Date(),
                    },
                });

                // Cập nhật trạng thái property trong cơ sở dữ liệu
                await prisma.property.update({
                    where: { propertyId: contract.propertyId },
                    data: {
                        status: PropertyStatus.ACTIVE, // Hoặc trạng thái phù hợp với yêu cầu của bạn
                    },
                });

                RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
                    data: {
                        propertyId: contract.propertyId,
                        status: PropertyStatus.ACTIVE,
                    },
                    type: CONTRACT_QUEUE.type.UPDATE_STATUS,
                });

                console.log('Contract ended successfully:', receipt);
                return updatedContract;
            } else {
                throw new Error('Contract cannot be ended before three days of creation.');
            }
        } else if (rentalStatus === 1 || rentalStatus === 2) {
            // Deposited or Ongoing
            // Kiểm tra xem ngày hiện tại có phải là ngày kết thúc hợp đồng hay không
            const currentDate = new Date();
            const endDate = new Date(contract.endDate);

            // Log ngày hiện tại và ngày kết thúc hợp đồng
            console.log('Current date:', currentDate);
            console.log('End date:', endDate);

            if (!isSameDay(currentDate, endDate)) {
                throw new Error('Today is not the end date of the contract.');
            }

            // Hoàn trả tiền đặt cọc cho người thuê
            const receipt = await rentalContract.methods.endContract(contractId).send({
                from: userAddress,
                gas: '3000000',
                gasPrice: web3.utils.toWei('30', 'gwei').toString(),
            });

            // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
            const updatedContract = await prisma.contract.update({
                where: { contractId: contractId },
                data: {
                    status: Status.ENDED,
                    updatedAt: new Date(),
                },
            });

            // Cập nhật trạng thái property trong cơ sở dữ liệu
            await prisma.property.update({
                where: { propertyId: contract.propertyId },
                data: {
                    status: PropertyStatus.ACTIVE, // Hoặc trạng thái phù hợp với yêu cầu của bạn
                },
            });

            RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
                data: {
                    propertyId: contract.propertyId,
                    status: PropertyStatus.ACTIVE,
                },
                type: CONTRACT_QUEUE.type.UPDATE_STATUS,
            });

            console.log('Contract ended successfully:', receipt);
            return updatedContract;
        } else {
            throw new Error('Contract is not in a valid state for ending.');
        }
    } catch (error) {
        console.error('Error in endContract:', error);
        throw new Error(`Failed to end contract: ${(error as Error).message}`);
    }
};

// !
export const terminateForNonPayment = async (contractId: string, ownerId: string): Promise<PrismaContract> => {
    try {
        // Kiểm tra xem hợp đồng có quá hạn thanh toán hay không
        // await checkOverduePayments();

        // Lấy thông tin hợp đồng từ cơ sở dữ liệu
        const contract = await prisma.contract.findUnique({
            where: { contractId: contractId },
        });

        if (!contract) {
            throw new Error('Contract not found.');
        }

        // Kiểm tra xem hợp đồng đã quá hạn chưa
        const currentDate = new Date();
        const endDate = new Date(contract.endDate); // Giả sử bạn có trường `endDate` trong cơ sở dữ liệu hợp đồng
        if (currentDate <= endDate) {
            throw new Error('Contract is not overdue yet.');
        }

        // Lấy thông tin người dùng từ cơ sở dữ liệu
        const owner = await prisma.user.findUnique({
            where: { userId: ownerId },
        });

        if (!owner || !owner.walletAddress) {
            throw new Error('Owner not found or does not have a wallet address.');
        }

        const ownerAddress = owner.walletAddress.toLowerCase();

        // Lấy thông tin chi tiết hợp đồng từ hợp đồng thông minh
        const rental: any = await rentalContract.methods.getContractDetails(contractId).call({
            from: ownerAddress,
        });

        // Chuyển đổi trạng thái hợp đồng thành số nguyên
        const rentalStatus = parseInt(rental.status, 10);
        if (rentalStatus !== 2) {
            // ONGOING = 2
            throw new Error('Contract is not in an ongoing state.');
        }

        // Kết thúc hợp đồng trên blockchain
        const gasEstimate = await rentalContract.methods.terminateForNonPayment(contractId).estimateGas({
            from: ownerAddress,
        });

        const receipt = await rentalContract.methods.terminateForNonPayment(contractId).send({
            from: ownerAddress,
            gas: gasEstimate.toString(),
            gasPrice: web3.utils.toWei('30', 'gwei').toString(),
        });

        // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
        const updatedContract = await prisma.contract.update({
            where: { contractId: contractId },
            data: {
                status: Status.ENDED,
                updatedAt: new Date(),
            },
        });

        // Cập nhật trạng thái property trong cơ sở dữ liệu
        await prisma.property.update({
            where: { propertyId: contract.propertyId },
            data: {
                status: PropertyStatus.ACTIVE,
            },
        });

        RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
            data: {
                propertyId: contract.propertyId,
                status: PropertyStatus.ACTIVE,
            },
            type: CONTRACT_QUEUE.type.UPDATE_STATUS,
        });

        console.log('Contract terminated successfully:', receipt);
        return updatedContract;
    } catch (error) {
        console.error('Error in terminateForNonPayment:', error);
        throw error;
    }
};

export const getContractTransactions = async (contractId: string, userId: string): Promise<any[]> => {
    try {
        // Lấy thông tin người dùng từ cơ sở dữ liệu
        const user = await prisma.user.findUnique({
            where: { userId: userId },
        });

        if (!user || !user.walletAddress) {
            throw new Error('User not found or does not have a wallet address.');
        }

        const userAddress = user.walletAddress.toLowerCase();

        // Lấy danh sách giao dịch từ blockchain
        const transactions = await rentalContract.methods.getContractTransactions(contractId).call({
            from: userAddress,
        });

        if (!transactions || transactions.length === 0) {
            throw new Error('No transactions found for this contract.');
        }

        // Chuyển đổi dữ liệu từ blockchain thành định dạng phù hợp
        const formattedTransactions = transactions.map((transaction: any) => ({
            from: transaction.from,
            to: transaction.to,
            amount: Number(transaction.amount), // Chuyển đổi BigInt sang number
            timestamp: new Date(Number(transaction.timestamp) * 1000).toISOString(), // Chuyển đổi BigInt sang number trước khi chuyển đổi timestamp
            transactionType: transaction.transactionType,
        }));

        console.log('Blockchain Transactions:', transactions);

        return formattedTransactions;
    } catch (error) {
        console.error('Error in getContractTransactions:', error);
        throw new Error(`Failed to retrieve contract transactions: ${(error as Error).message}`);
    }
};

// Hàm lấy chi tiết hợp đồng từ cơ sở dữ liệu
export const getContractDetail = async ({ contractId, userId }: IGetContractDetail): Promise<any> => {
    return prisma.contract.findUnique({
        where: {
            contractId,
            OR: [
                {
                    ownerId: userId,
                },
                {
                    renterId: userId,
                },
            ],
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
                    endDate: {
                        gte: rentalStartDate,
                    },
                },
            ],
        },
        select: {
            propertyId: true,
            startDate: true,
            endDate: true,
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
            endDate: {
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

export const getContractById = ({ contractId, userId }: { contractId: string; userId: string }) => {
    return prisma.contract.findUnique({
        where: {
            contractId: contractId,
            OR: [
                {
                    ownerId: userId,
                },
                {
                    renterId: userId,
                },
            ],
        },
        include: {
            owner: true,
            renter: true,
        },
    });
};
