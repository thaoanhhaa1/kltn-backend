// //contract.repository.ts

import { Contract as PrismaContract, PropertyStatus, Status } from '@prisma/client';
import {
    addDays,
    addMonths,
    differenceInDays,
    endOfDay,
    isAfter,
    isBefore,
    isSameDay,
    isSameMonth,
    startOfDay,
} from 'date-fns';
import Web3 from 'web3';
import RentalContractABI from '../../contractRental/build/contracts/RentalContract.json'; // ABI của hợp đồng
// import RentalContractABI from '../../contractRental/build/contracts/staging/RentalContract.json'; // ABI của hợp đồng
import envConfig from '../configs/env.config';
import prisma from '../prisma/prismaClient';
import { CreateContractReq } from '../schemas/contract.schema';
import { checkOverduePayments } from '../tasks/checkOverduePayments';

// Khởi tạo Web3 và hợp đồng từ biến môi trường
const web3 = new Web3(new Web3.providers.HttpProvider(envConfig.GANACHE_URL));

const contractAddress = envConfig.RENTAL_CONTRACT_ADDRESS;

// Kiểm tra tính hợp lệ của địa chỉ hợp đồng
if (!web3.utils.isAddress(contractAddress)) {
    throw new Error('Invalid contract address.');
}

const rentalContract = new web3.eth.Contract(RentalContractABI.abi as any, contractAddress);

// Định nghĩa hàm tạo hợp đồng trên blockchain
const createBlockchainContract = async (
    ownerAddress: string,
    renterAddress: string,
    startDate: number,
    endDate: number,
    monthlyRent: number,
    depositAmount: number,
) => {
    try {
        const receipt = await rentalContract.methods
            .createContract(
                ownerAddress, // Địa chỉ chủ nhà
                renterAddress, // Địa chỉ người thuê
                startDate, // Ngày bắt đầu
                endDate, // Ngày kết thúc
                depositAmount, // Số tiền đặt cọc
                monthlyRent, // Giá thuê hàng tháng
            )
            .send({
                from: ownerAddress,
                gas: '3000000',
                gasPrice: web3.utils.toWei('20', 'gwei').toString(),
            });

        console.log('Blockchain contract created successfully:');
        console.log(receipt);

        return receipt;
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error creating blockchain contract:', error.message);
        } else {
            console.error('Unknown error occurred while creating blockchain contract.');
        }
        throw error;
    }
};

// Hàm tạo hợp đồng và lưu trữ vào cơ sở dữ liệu
export const createContract = async (contract: CreateContractReq): Promise<PrismaContract> => {
    // Lấy thông tin địa chỉ của chủ nhà và người thuê từ bảng `User`
    const owner = await prisma.user.findUnique({
        where: { user_id: contract.owner_user_id },
    });

    const renter = await prisma.user.findUnique({
        where: { user_id: contract.renter_user_id },
    });

    if (!owner || !renter) {
        throw new Error('Invalid owner or renter user ID');
    }

    // Kiểm tra và đảm bảo wallet_address không phải là null
    if (!owner.wallet_address || !renter.wallet_address) {
        throw new Error('Owner or renter does not have a wallet address');
    }

    // Lấy thông tin bất động sản từ cơ sở dữ liệu
    const property = await prisma.property.findUnique({
        where: { property_id: contract.property_id },
    });

    if (!property) {
        throw new Error('Property not found.');
    }

    // Kiểm tra trạng thái bất động sản
    if (property.status !== PropertyStatus.ACTIVE) {
        throw new Error('Property is not available for rent.');
    }

    const startDateTimestamp = Math.floor(contract.start_date.getTime() / 1000);
    const endDateTimestamp = Math.floor(contract.end_date.getTime() / 1000);

    // Tạo hợp đồng trên blockchain
    const blockchainReceipt = await createBlockchainContract(
        owner.wallet_address, // Địa chỉ của chủ nhà
        renter.wallet_address, // Địa chỉ của người thuê
        startDateTimestamp,
        endDateTimestamp,
        contract.monthly_rent,
        contract.deposit_amount,
    );

    if (!blockchainReceipt.transactionHash) {
        throw new Error('Blockchain transaction hash is undefined');
    }

    // Xây dựng đối tượng dữ liệu cho Prisma
    const contractData = {
        owner_user_id: contract.owner_user_id,
        renter_user_id: contract.renter_user_id,
        property_id: contract.property_id,
        start_date: contract.start_date,
        end_date: contract.end_date,
        deleted: false,
        status: Status.WAITING,
        monthly_rent: contract.monthly_rent,
        deposit_amount: contract.deposit_amount,
        created_at: new Date(),
        updated_at: new Date(),
        contract_terms: contract.contract_terms,
        transaction_hash_contract: blockchainReceipt.transactionHash,
    };

    // Lưu thông tin hợp đồng vào cơ sở dữ liệu
    const createdContract = await prisma.contract.create({
        data: contractData,
    });

    console.log('Contract created and saved to database successfully:');
    console.log(createdContract);

    return createdContract;
};

// Hàm thực hiện đặt cọc và cập nhật hợp đồng
// export const deposit = async (contractId: number, renterUserId: string): Promise<PrismaContract> => {
//     try {
//         // Lấy thông tin hợp đồng từ cơ sở dữ liệu
//         const contract = await prisma.contract.findUnique({
//             where: { contract_id: contractId },
//         });

//         if (!contract) {
//             throw new Error('Contract not found.');
//         }

//         // Lấy thông tin người thuê từ cơ sở dữ liệu
//         const renter = await prisma.user.findUnique({
//             where: { user_id: renterUserId },
//         });

//         if (!renter || !renter.wallet_address) {
//             throw new Error('Renter not found or does not have a wallet address.');
//         }

//         const renterAddress = renter.wallet_address.toLowerCase();

//         // Lấy thông tin hợp đồng từ hợp đồng thông minh
//         const rental: any = await rentalContract.methods.getContractDetails(contractId).call({
//             from: renterAddress // Đảm bảo rằng địa chỉ gọi hàm là người thuê hợp đồng
//         });

//         console.log('Rental Details:', rental);

//         const depositAmount = rental.depositAmount;

//         // Kiểm tra xem renterAddress có trùng với renter trên hợp đồng không
//         if (renterAddress !== rental.renter.toLowerCase()) {
//             throw new Error('Renter address mismatch.');
//         }

//          // Kiểm tra số dư của người thuê
//         const renterBalance = await web3.eth.getBalance(renterAddress);
//         if (Number(renterBalance) < Number(rental.depositAmount)) {
//             throw new Error('Insufficient balance to pay deposit amount.');
//         }

//         // Ước lượng lượng gas cần thiết
//         const gasEstimate = await rentalContract.methods.deposit(contractId).estimateGas({
//             from: renterAddress,
//             value: depositAmount,
//         });
//         console.log('Estimated Gas:', gasEstimate);

//         // Gọi hàm deposit trên smart contract
//         const receipt = await rentalContract.methods.deposit(contractId).send({
//             from: renterAddress,
//             value: depositAmount,
//             gas: gasEstimate.toString(),
//             gasPrice: web3.utils.toWei('30', 'gwei').toString()
//         });
//         console.log('Transaction receipt:', receipt);

//         // Lưu thông tin giao dịch vào cơ sở dữ liệu
//         await prisma.transaction.create({
//             data: {
//                 contract_id: contractId,
//                 amount: Number(depositAmount),
//                 transaction_hash: receipt.transactionHash,
//                 status: 'COMPLETED',
//                 description: 'Deposit transaction',
//             },
//         });

//         // Cập nhật trạng thái bất động sản thành UNAVAILABLE
//         await prisma.property.update({
//             where: { property_id: contract.property_id },
//             data: { status: PropertyStatus.UNAVAILABLE },
//         });

//         // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
//         const updatedContract = await prisma.contract.update({
//             where: { contract_id: contractId },
//             data: {
//                 status: 'DEPOSITED', // Cập nhật trạng thái hợp đồng thành ACCEPTED sau khi thanh toán
//                 updated_at: new Date() // Cập nhật thời gian
//             }
//         });
//         console.log('Updated Contract:', updatedContract);

//         return updatedContract;
//     } catch (error) {
//         console.error('Error in deposit:', error);
//         throw new Error(`Failed to process deposit: ${(error as Error).message}`);
//     }
// };

export const deposit = async (contractId: number, renterUserId: string): Promise<PrismaContract> => {
    try {
        // Lấy thông tin hợp đồng từ cơ sở dữ liệu
        const contract = await prisma.contract.findUnique({
            where: { contract_id: contractId },
        });

        if (!contract) {
            throw new Error('Contract not found.');
        }

        // Lấy thông tin người thuê từ cơ sở dữ liệu
        const renter = await prisma.user.findUnique({
            where: { user_id: renterUserId },
        });

        if (!renter || !renter.wallet_address) {
            throw new Error('Renter not found or does not have a wallet address.');
        }

        const renterAddress = renter.wallet_address.toLowerCase();
        console.log('🚀 ~ deposit ~ renterAddress:', renterAddress);

        // Lấy thông tin hợp đồng từ hợp đồng thông minh
        const rental: any = await rentalContract.methods.getContractDetails(contractId).call({
            from: renterAddress,
        });

        console.log('Rental Details:', rental);

        const depositAmount = rental.depositAmount;

        // Kiểm tra xem renterAddress có trùng với renter trên hợp đồng không
        if (renterAddress !== rental.renter.toLowerCase()) {
            throw new Error('Renter address does not match the contract.');
        }

        // Kiểm tra số dư của người thuê
        const renterBalance = await web3.eth.getBalance(renterAddress);
        if (Number(renterBalance) < Number(depositAmount)) {
            throw new Error('Insufficient balance for deposit.');
        }

        // Ước lượng lượng gas cần thiết
        const gasEstimate = await rentalContract.methods.deposit(contractId).estimateGas({
            from: renterAddress,
            value: depositAmount,
        });
        console.log('Estimated Gas:', gasEstimate);

        // Gọi hàm deposit trên smart contract
        const receipt = await rentalContract.methods.deposit(contractId).send({
            from: renterAddress,
            value: depositAmount,
            gas: gasEstimate.toString(),
            gasPrice: web3.utils.toWei('30', 'gwei').toString(),
        });
        console.log('Transaction receipt:', receipt);

        // Lưu thông tin giao dịch vào cơ sở dữ liệu
        await prisma.transaction.create({
            data: {
                contract_id: contractId,
                amount: Number(depositAmount),
                transaction_hash: receipt.transactionHash,
                status: 'COMPLETED',
                description: 'Deposit transaction',
            },
        });

        // Cập nhật trạng thái bất động sản thành UNAVAILABLE
        await prisma.property.update({
            where: { property_id: contract.property_id },
            data: { status: PropertyStatus.UNAVAILABLE },
        });

        // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
        const updatedContract = await prisma.contract.update({
            where: { contract_id: contractId },
            data: {
                status: 'DEPOSITED',
                updated_at: new Date(),
            },
        });
        console.log('Updated Contract:', updatedContract);

        return updatedContract;
    } catch (error) {
        console.error('Error in deposit:', error);
        throw new Error(`Failed to process deposit: ${(error as Error).message}`);
    }
};

export const payMonthlyRent = async (contractId: number, renterUserId: string): Promise<PrismaContract> => {
    try {
        // Lấy thông tin hợp đồng từ cơ sở dữ liệu
        const contract = await prisma.contract.findUnique({
            where: { contract_id: contractId },
        });

        if (!contract) {
            throw new Error('Contract not found.');
        }

        // Lấy thông tin người thuê từ cơ sở dữ liệu
        const renter = await prisma.user.findUnique({
            where: { user_id: renterUserId },
        });

        if (!renter || !renter.wallet_address) {
            throw new Error('Renter not found or does not have a wallet address.');
        }

        const renterAddress = renter.wallet_address.toLowerCase();

        // Lấy thông tin hợp đồng từ hợp đồng thông minh
        const rental: any = await rentalContract.methods.getContractDetails(contractId).call({
            from: renterAddress,
        });

        // Kiểm tra xem renterAddress có trùng với renter trên hợp đồng không
        if (renterAddress.toLowerCase() !== rental.renter.toLowerCase()) {
            throw new Error('Renter address mismatch.');
        }

        const currentTime = new Date();
        console.log(`Current time: ${currentTime}`);

        // Kiểm tra lịch sử giao dịch xem đã có thanh toán nào trong ngày chưa
        const existingPaymentToday = await prisma.transaction.findFirst({
            where: {
                contract_id: contractId,
                created_at: {
                    gte: startOfDay(currentTime),
                    lt: endOfDay(currentTime),
                },
                description: 'Monthly rent payment',
            },
        });

        if (existingPaymentToday) {
            throw new Error('Rent payment already made for today.');
        }

        const startDate = new Date(Number(rental.startDate) * 1000);
        console.log(`Start date: ${startDate}`);

        const rentalStatus = parseInt(rental.status, 10);

        if (rentalStatus === 0 || rentalStatus === 3) {
            // RENTAL_STATUS_NOT_CREATED = 0; RENTAL_STATUS_ENDED = 3
            throw new Error('Rental period not started or already ended.');
        }

        // Kiểm tra số tiền thuê hàng tháng có chính xác không
        if (web3.utils.toWei(contract.monthly_rent.toString(), 'wei') !== rental.monthlyRent.toString()) {
            throw new Error('Incorrect rent amount.');
        }

        // Kiểm tra số dư của người thuê
        const renterBalance = await web3.eth.getBalance(renterAddress);
        if (Number(renterBalance) < Number(rental.monthlyRent)) {
            throw new Error('Insufficient balance to pay rent.');
        }

        // Tính toán ngày thanh toán tiếp theo
        let nextPaymentDate = new Date(startDate);

        if (isBefore(currentTime, startDate)) {
            throw new Error('Cannot pay before the contract start date.');
        }

        if (isSameMonth(currentTime, startDate) && isBefore(startDate, currentTime)) {
            nextPaymentDate = startDate;
        } else {
            while (isBefore(nextPaymentDate, currentTime)) {
                nextPaymentDate = addMonths(nextPaymentDate, 1);
            }
        }

        nextPaymentDate.setDate(startDate.getDate());
        console.log(`Next payment date: ${nextPaymentDate}`);

        const paymentWindowEnd = addDays(nextPaymentDate, 20);
        console.log(`Payment window end: ${paymentWindowEnd}`);

        if (isBefore(currentTime, nextPaymentDate) || isAfter(currentTime, paymentWindowEnd)) {
            throw new Error('Today is not within the payment window for rent payment.');
        }

        // Ước lượng lượng gas cần thiết
        const gasEstimate = await rentalContract.methods.payRent(contractId).estimateGas({
            from: renterAddress,
            value: rental.monthlyRent,
        });

        // Gọi hàm payRent trên smart contract
        const receipt = await rentalContract.methods.payRent(contractId).send({
            from: renterAddress,
            value: rental.monthlyRent,
            gas: gasEstimate.toString(),
            gasPrice: web3.utils.toWei('30', 'gwei').toString(),
        });

        console.log(`Transaction hash: ${receipt.transactionHash}`);

        // Lưu thông tin giao dịch vào cơ sở dữ liệu
        await prisma.transaction.create({
            data: {
                contract_id: contractId,
                amount: Number(rental.monthlyRent),
                transaction_hash: receipt.transactionHash,
                status: 'COMPLETED',
                description: 'Monthly rent payment',
            },
        });

        // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu sau khi thanh toán thành công
        const updatedContract = await prisma.contract.update({
            where: { contract_id: contractId },
            data: {
                updated_at: new Date(),
                status: 'ONGOING',
            },
        });

        console.log(`Contract ${contractId} updated successfully.`);

        return updatedContract;
    } catch (error) {
        console.error('Error in payMonthlyRent:', error);
        throw error;
    }
};

// Hàm kiểm tra thông báo trước 30 ngày
const isNotificationBefore30Days = (cancellationDate: Date): boolean => {
    const today = new Date();
    const daysDifference = differenceInDays(cancellationDate, today);
    return daysDifference >= 30;
};

export const cancelContractByRenter = async (
    contractId: number,
    renterUserId: string,
    cancellationDate: Date,
): Promise<PrismaContract> => {
    try {
        // Lấy thông tin hợp đồng từ cơ sở dữ liệu
        const contract = await prisma.contract.findUnique({
            where: { contract_id: contractId },
        });

        if (!contract) {
            throw new Error('Contract not found.');
        }

        // Xác định thông báo trước 30 ngày
        const notifyBefore30Days = isNotificationBefore30Days(cancellationDate);

        // Lấy thông tin người thuê từ cơ sở dữ liệu
        const renter = await prisma.user.findUnique({
            where: { user_id: renterUserId },
        });

        if (!renter || !renter.wallet_address) {
            throw new Error('Renter not found or does not have a wallet address.');
        }

        const renterAddress = renter.wallet_address.toLowerCase();

        // Lấy thông tin hợp đồng từ hợp đồng thông minh
        const rental: any = await rentalContract.methods.getContractDetails(contractId).call({
            from: renterAddress, // Đảm bảo rằng địa chỉ gọi hàm là người thuê hợp đồng
        });

        console.log(`Contract details on blockchain: `, rental);

        // Kiểm tra xem renterAddress có trùng với renter trên hợp đồng không
        if (renterAddress.toLowerCase() !== rental.renter.toLowerCase()) {
            throw new Error('Renter address mismatch.');
        }

        // Kiểm tra trạng thái hợp đồng
        if (rental.status === 3) {
            // Assuming 3 is for Ended status
            throw new Error('Contract has already ended.');
        }

        let extraCharge = 0;
        let depositLoss = 0;

        if (!notifyBefore30Days) {
            // Nếu không thông báo trước 30 ngày, lấy tiền thuê hàng tháng làm extraCharge
            extraCharge = Number(web3.utils.fromWei(rental.monthlyRent, 'wei'));

            // Ước lượng lượng gas cần thiết
            const gasEstimate = await rentalContract.methods
                .cancelContractByRenter(contractId, notifyBefore30Days)
                .estimateGas({
                    from: renterAddress,
                    value: web3.utils.toWei(extraCharge.toString(), 'wei'),
                });

            // Gọi hàm cancelContractByRenter trên smart contract
            const receipt = await rentalContract.methods.cancelContractByRenter(contractId, notifyBefore30Days).send({
                from: renterAddress,
                value: web3.utils.toWei(extraCharge.toString(), 'wei'),
                gas: gasEstimate.toString(),
                gasPrice: web3.utils.toWei('30', 'gwei').toString(),
            });

            // Xử lý thành công và lưu thông tin giao dịch vào cơ sở dữ liệu
            await prisma.transaction.create({
                data: {
                    contract_id: contractId,
                    amount: extraCharge,
                    transaction_hash: receipt.transactionHash,
                    status: 'COMPLETED',
                    description: 'Contract cancellation with extra charge',
                },
            });

            // Tiền cọc sẽ được chuyển cho chủ hợp đồng
            depositLoss = Number(web3.utils.fromWei(rental.depositAmount, 'wei'));
            await prisma.transaction.create({
                data: {
                    contract_id: contractId,
                    amount: depositLoss,
                    transaction_hash: receipt.transactionHash,
                    status: 'COMPLETED',
                    description: 'Deposit transferred to owner upon contract cancellation',
                },
            });
        } else {
            // Nếu thông báo trước 30 ngày
            // Ước lượng lượng gas cần thiết
            const gasEstimate = await rentalContract.methods
                .cancelContractByRenter(contractId, notifyBefore30Days)
                .estimateGas({
                    from: renterAddress,
                });

            // Gọi hàm cancelContractByRenter trên smart contract
            const receipt = await rentalContract.methods.cancelContractByRenter(contractId, notifyBefore30Days).send({
                from: renterAddress,
                gas: gasEstimate.toString(),
                gasPrice: web3.utils.toWei('30', 'gwei').toString(),
            });

            // Xử lý hoàn trả và lưu thông tin giao dịch vào cơ sở dữ liệu
            await prisma.transaction.create({
                data: {
                    contract_id: contractId,
                    amount: Number(web3.utils.fromWei(rental.depositAmount, 'wei')),
                    transaction_hash: receipt.transactionHash,
                    status: 'COMPLETED',
                    description: 'Contract cancellation with deposit refund',
                },
            });
        }

        // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
        const updatedContract = await prisma.contract.update({
            where: { contract_id: contractId },
            data: {
                status: 'ENDED', // Hoặc trạng thái phù hợp với yêu cầu của bạn
                updated_at: new Date(),
            },
        });

        // Cập nhật trạng thái property trong cơ sở dữ liệu
        await prisma.property.update({
            where: { property_id: contract.property_id },
            data: {
                status: 'ACTIVE', // Hoặc trạng thái phù hợp với yêu cầu của bạn
            },
        });

        console.log('Contract successfully cancelled by renter.');
        return updatedContract;
    } catch (error) {
        console.error('Error in cancelContractByRenter:', error);
        throw error;
    }
};

export const cancelContractByOwner = async (
    contractId: number,
    ownerUserId: string,
    cancellationDate: Date,
): Promise<PrismaContract> => {
    try {
        // Lấy thông tin hợp đồng từ cơ sở dữ liệu
        const contract = await prisma.contract.findUnique({
            where: { contract_id: contractId },
        });

        if (!contract) {
            throw new Error('Contract not found.');
        }

        // Xác định thông báo trước 30 ngày
        const notifyBefore30Days = isNotificationBefore30Days(cancellationDate);

        // Lấy thông tin người chủ từ cơ sở dữ liệu
        const owner = await prisma.user.findUnique({
            where: { user_id: ownerUserId },
        });

        if (!owner || !owner.wallet_address) {
            throw new Error('Owner not found or does not have a wallet address.');
        }

        const ownerAddress = owner.wallet_address.toLowerCase();

        // Lấy thông tin hợp đồng từ hợp đồng thông minh
        const rental: any = await rentalContract.methods.getContractDetails(contractId).call({
            from: ownerAddress,
        });

        console.log(`Contract details on blockchain: `, rental);

        // Kiểm tra xem ownerAddress có trùng với owner trên hợp đồng không
        if (ownerAddress.toLowerCase() !== rental.owner.toLowerCase()) {
            throw new Error('Owner address mismatch.');
        }

        // Kiểm tra trạng thái hợp đồng trước khi thực hiện hành động
        if (Number(rental.status.toString()) === 3) {
            // Assuming 3 is for Ended status
            throw new Error('Contract has already ended.');
        }

        let compensation = 0;
        let depositAmount = 0;

        // Xác định số tiền bồi thường và tiền cọc cần hoàn trả
        if (!notifyBefore30Days) {
            compensation = Number(web3.utils.fromWei(rental.monthlyRent, 'wei'));
        }

        if (contract.status === Status.DEPOSITED || contract.status === Status.ONGOING) {
            depositAmount = Number(web3.utils.fromWei(rental.depositAmount, 'wei'));
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
                contract_id: contractId,
                amount: compensation + depositAmount,
                transaction_hash: receipt.transactionHash,
                status: 'COMPLETED',
                description: notifyBefore30Days ? 'Contract cancellation' : 'Contract cancellation with compensation',
            },
        });

        // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
        const updatedContract = await prisma.contract.update({
            where: { contract_id: contractId },
            data: {
                status: 'ENDED',
                updated_at: new Date(),
            },
        });

        // Cập nhật trạng thái property trong cơ sở dữ liệu
        await prisma.property.update({
            where: { property_id: contract.property_id },
            data: {
                status: 'ACTIVE', // Hoặc trạng thái phù hợp với yêu cầu của bạn
            },
        });

        return updatedContract;
    } catch (error) {
        console.error('Error in cancelContractByOwnerService:', error);
        throw error;
    }
};

// Hàm để kết thúc hợp đồng
// export const endContract = async (contractId: number, userId: string): Promise<any> => {
//     try {
//         // Lấy thông tin hợp đồng từ cơ sở dữ liệu
//         const contract = await prisma.contract.findUnique({
//             where: { contract_id: contractId },
//         });

//         if (!contract) {
//             throw new Error('Contract not found.');
//         }

//         // Lấy thông tin người dùng từ cơ sở dữ liệu
//         const user = await prisma.user.findUnique({
//             where: { user_id: userId },
//         });

//         if (!user || !user.wallet_address) {
//             throw new Error('User not found or does not have a wallet address.');
//         }

//         const userAddress = user.wallet_address.toLowerCase();

//         // Lấy thông tin chi tiết hợp đồng từ hợp đồng thông minh
//         const rental: any = await rentalContract.methods.getContractDetails(contractId).call({
//             from: userAddress,
//         });

//         // Chuyển đổi trạng thái hợp đồng thành số nguyên
//         const rentalStatus = parseInt(rental.status, 10);

//         // Log trạng thái hợp đồng
//         console.log('Rental status:', rentalStatus);

//         if (rentalStatus === 0) { // NotCreated
//             const threeDaysAfterCreation = addDays(new Date(contract.created_at), 3);
//             const currentDate = new Date();

//             // Log ngày hiện tại và ngày ba ngày sau khi tạo hợp đồng
//             console.log('Current date:', currentDate);
//             console.log('Three days after creation:', threeDaysAfterCreation);

//             if (isAfter(currentDate, threeDaysAfterCreation)) {
//                 // Thay đổi trạng thái hợp đồng thành Ended
//                 const receipt = await rentalContract.methods.endContract(contractId).send({
//                     from: userAddress,
//                     gas: '3000000',
//                     gasPrice: web3.utils.toWei('30', 'gwei').toString(),
//                 });

//                 // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
//                 const updatedContract = await prisma.contract.update({
//                     where: { contract_id: contractId },
//                     data: {
//                         status: 'ENDED',
//                         updated_at: new Date(),
//                     },
//                 });

//                 // Cập nhật trạng thái property trong cơ sở dữ liệu
//                 await prisma.property.update({
//                     where: { property_id: contract.property_id },
//                     data: {
//                         status: 'ACTIVE', // Hoặc trạng thái phù hợp với yêu cầu của bạn
//                     },
//                 });

//                 console.log('Contract ended successfully:', receipt);
//                 return updatedContract;
//             } else {
//                 throw new Error('Contract cannot be ended before three days of creation.');
//             }
//         } else if (rentalStatus === 1 || rentalStatus === 2) { // Deposited or Ongoing
//             // Kiểm tra xem ngày hiện tại có phải là ngày kết thúc hợp đồng hay không
//             const currentDate = new Date();
//             const endDate = new Date(contract.end_date);

//             // Log ngày hiện tại và ngày kết thúc hợp đồng
//             console.log('Current date:', currentDate);
//             console.log('End date:', endDate);

//             if (!isSameDay(currentDate, endDate)) {
//                 throw new Error('Today is not the end date of the contract.');
//             }

//             // Hoàn trả tiền đặt cọc cho người thuê
//             const receipt = await rentalContract.methods.endContract(contractId).send({
//                 from: userAddress,
//                 gas: '3000000',
//                 gasPrice: web3.utils.toWei('30', 'gwei').toString(),
//             });

//             // Lưu thông tin giao dịch vào cơ sở dữ liệu
//             await prisma.transaction.create({
//                 data: {
//                     contract_id: contractId,
//                     amount: Number(contract.deposit_amount),
//                     transaction_hash: receipt.transactionHash,
//                     status: 'COMPLETED',
//                     description: 'End contract',
//                 },
//             });

//             // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
//             const updatedContract = await prisma.contract.update({
//                 where: { contract_id: contractId },
//                 data: {
//                     status: 'ENDED',
//                     updated_at: new Date(),
//                 },
//             });

//             // Cập nhật trạng thái property trong cơ sở dữ liệu
//             await prisma.property.update({
//                 where: { property_id: contract.property_id },
//                 data: {
//                     status: 'ACTIVE', // Hoặc trạng thái phù hợp với yêu cầu của bạn
//                 },
//             });

//             console.log('Contract ended successfully:', updatedContract);
//             return updatedContract;
//         } else if (rentalStatus === 3) { // Ended
//             throw new Error('Contract is already ended.');
//         } else {
//             throw new Error('Contract is not in a valid state for ending.');
//         }
//     } catch (error) {
//         console.error('Error in endContract:', error);
//         throw error;
//     }
// };

// Hàm để kết thúc hợp đồng
export const endContract = async (contractId: number, userId: string): Promise<any> => {
    try {
        // Lấy thông tin hợp đồng từ cơ sở dữ liệu
        const contract = await prisma.contract.findUnique({
            where: { contract_id: contractId },
        });

        if (!contract) {
            throw new Error('Contract not found.');
        }

        // Lấy thông tin người dùng từ cơ sở dữ liệu
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
        });

        if (!user || !user.wallet_address) {
            throw new Error('User not found or does not have a wallet address.');
        }

        const userAddress = user.wallet_address.toLowerCase();

        // Lấy thông tin chi tiết hợp đồng từ hợp đồng thông minh
        const rental: any = await rentalContract.methods.getContractDetails(contractId).call({
            from: userAddress,
        });

        // Kiểm tra quyền truy cập: người dùng có phải là chủ nhà hoặc người thuê không
        if (userAddress !== rental.owner.toLowerCase() && userAddress !== rental.renter.toLowerCase()) {
            throw new Error('User address does not match the contract owner or renter.');
        }

        // Chuyển đổi trạng thái hợp đồng thành số nguyên
        const rentalStatus = parseInt(rental.status, 10);

        // Log trạng thái hợp đồng
        console.log('Rental status:', rentalStatus);

        if (rentalStatus === 0) {
            // NotCreated
            const threeDaysAfterCreation = addDays(new Date(contract.created_at), 3);
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
                    where: { contract_id: contractId },
                    data: {
                        status: 'ENDED',
                        updated_at: new Date(),
                    },
                });

                // Cập nhật trạng thái property trong cơ sở dữ liệu
                await prisma.property.update({
                    where: { property_id: contract.property_id },
                    data: {
                        status: 'ACTIVE', // Hoặc trạng thái phù hợp với yêu cầu của bạn
                    },
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
            const endDate = new Date(contract.end_date);

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

            // Lưu thông tin giao dịch vào cơ sở dữ liệu
            await prisma.transaction.create({
                data: {
                    contract_id: contractId,
                    amount: Number(contract.deposit_amount),
                    transaction_hash: receipt.transactionHash,
                    status: 'COMPLETED',
                    description: 'End contract',
                },
            });

            // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
            const updatedContract = await prisma.contract.update({
                where: { contract_id: contractId },
                data: {
                    status: 'ENDED',
                    updated_at: new Date(),
                },
            });

            // Cập nhật trạng thái property trong cơ sở dữ liệu
            await prisma.property.update({
                where: { property_id: contract.property_id },
                data: {
                    status: 'ACTIVE', // Hoặc trạng thái phù hợp với yêu cầu của bạn
                },
            });

            console.log('Contract ended successfully:', updatedContract);
            return updatedContract;
        } else if (rentalStatus === 3) {
            // Ended
            throw new Error('Contract is already ended.');
        } else {
            throw new Error('Contract is not in a valid state for ending.');
        }
    } catch (error) {
        console.error('Error in endContract:', error);
        throw error;
    }
};

export const terminateForNonPayment = async (contractId: number, ownerId: string): Promise<PrismaContract> => {
    try {
        // Kiểm tra xem hợp đồng có quá hạn thanh toán hay không
        await checkOverduePayments();

        // Lấy thông tin hợp đồng từ cơ sở dữ liệu
        const contract = await prisma.contract.findUnique({
            where: { contract_id: contractId },
        });

        if (!contract) {
            throw new Error('Contract not found.');
        }

        // Kiểm tra xem hợp đồng đã quá hạn chưa
        const currentDate = new Date();
        const endDate = new Date(contract.end_date); // Giả sử bạn có trường `end_date` trong cơ sở dữ liệu hợp đồng
        if (currentDate <= endDate) {
            throw new Error('Contract is not overdue yet.');
        }

        // Lấy thông tin người dùng từ cơ sở dữ liệu
        const owner = await prisma.user.findUnique({
            where: { user_id: ownerId },
        });

        if (!owner || !owner.wallet_address) {
            throw new Error('Owner not found or does not have a wallet address.');
        }

        const ownerAddress = owner.wallet_address.toLowerCase();

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
            where: { contract_id: contractId },
            data: {
                status: 'ENDED',
                updated_at: new Date(),
            },
        });

        console.log('Contract terminated successfully:', receipt);
        return updatedContract;
    } catch (error) {
        console.error('Error in terminateForNonPayment:', error);
        throw error;
    }
};

export const getContractTransactions = async (contractId: number, userId: string): Promise<any[]> => {
    try {
        // Lấy thông tin người dùng từ cơ sở dữ liệu
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
        });

        if (!user || !user.wallet_address) {
            throw new Error('User not found or does not have a wallet address.');
        }

        const userAddress = user.wallet_address.toLowerCase();

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
export const getContractDetails = async (contractId: number, userId: string): Promise<any> => {
    try {
        // Lấy thông tin hợp đồng từ cơ sở dữ liệu
        const contract = await prisma.contract.findUnique({
            where: { contract_id: contractId },
            include: {
                owner: true, // Lấy thông tin chủ sở hữu
                renter: true, // Lấy thông tin người thuê
                property: true, // Lấy thông tin tài sản
                transactions: true, // Lấy danh sách giao dịch
            },
        });

        if (!contract) {
            throw new Error('Contract not found.');
        }

        // Kiểm tra quyền truy cập của người dùng
        if (contract.owner_user_id !== userId && contract.renter_user_id !== userId) {
            throw new Error('Access denied. Only the contract owner or renter can view the contract details.');
        }

        // Trả về thông tin hợp đồng
        return contract;
    } catch (error) {
        console.error('Error in getContractDetails:', error);
        throw new Error(`Failed to retrieve contract details: ${(error as Error).message}`);
    }
};

// Hàm lấy chi tiết hợp đồng từ hợp đồng thông minh
// export const getContractDetails = async (contractId: number, userId: number): Promise<any> => {
//     try {
//         // Lấy thông tin hợp đồng từ hợp đồng thông minh
//         const rental: any = await rentalContract.methods.getContractDetails(contractId).call();

//         if (!rental) {
//             throw new Error('Contract not found on the blockchain.');
//         }

//         // Lấy thông tin người dùng từ cơ sở dữ liệu
//         const user = await prisma.user.findUnique({
//             where: { user_id: userId },
//         });

//         if (!user || !user.wallet_address) {
//             throw new Error('User not found or does not have a wallet address.');
//         }

//         const userAddress = user.wallet_address.toLowerCase();

//         // Kiểm tra quyền truy cập: người dùng có phải là chủ nhà hoặc người thuê không
//         if (userAddress !== rental.owner.toLowerCase() && userAddress !== rental.renter.toLowerCase()) {
//             throw new Error('Access denied. You are not authorized to view this contract.');
//         }

//         return rental;
//     } catch (error) {
//         console.error('Error in getContractDetails:', error);
//         throw new Error(`Failed to retrieve contract details: ${(error as Error).message}`);
//     }
// };
