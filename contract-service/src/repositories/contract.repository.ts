import { Prisma, Contract as PrismaContract, PropertyStatus, Status } from '@prisma/client';
import { addDays, differenceInDays, isAfter, isSameDay } from 'date-fns';
import RentalContractABI from '../../contractRental/build/contracts/RentalContract.json'; // ABI của hợp đồng
import envConfig from '../configs/env.config';
import RabbitMQ from '../configs/rabbitmq.config';
import web3 from '../configs/web3.config';
import { CONTRACT_QUEUE } from '../constants/rabbitmq';
import { ICancelContract, ICancelContractBeforeDeposit, IContract, IGetContractInRange } from '../interfaces/contract';
import { IUserId } from '../interfaces/user';
import prisma from '../prisma/prismaClient';
import { checkOverduePayments } from '../tasks/checkOverduePayments';
import convertVNDToWei from '../utils/convertVNDToWei.util';

const contractAddress = envConfig.RENTAL_CONTRACT_ADDRESS;

// Kiểm tra tính hợp lệ của địa chỉ hợp đồng
if (!web3.utils.isAddress(contractAddress)) {
    throw new Error('Invalid contract address.');
}

const rentalContract = new web3.eth.Contract(RentalContractABI.abi as any, contractAddress);

export const createContract = async (
    contract: IContract & {
        transaction_hash: string;
    },
): Promise<PrismaContract> => {
    // Lưu hợp đồng vào cơ sở dữ liệu
    return prisma.contract.create({
        data: {
            contract_id: contract.contract_id,
            owner_user_id: contract.owner_user_id,
            renter_user_id: contract.renter_user_id,
            property_id: contract.property_id,
            start_date: contract.start_date,
            end_date: contract.end_date,
            monthly_rent: contract.monthly_rent,
            deposit_amount: contract.deposit_amount,
            contract_terms: contract.contract_terms,
            status: Status.WAITING,
            transaction_hash_contract: contract.transaction_hash,
        },
    });
};

export const findContractById = async (contractId: string) => {
    return prisma.contract.findUnique({
        where: { contract_id: contractId },
    });
};

export const deposit = (contractId: string) => {
    return prisma.contract.update({
        where: { contract_id: contractId },
        data: {
            status: Status.DEPOSITED, // Cập nhật trạng thái hợp đồng thành ACCEPTED sau khi thanh toán
        },
    });
};

export const updateStatusContract = (contractId: string, status: Status) => {
    return prisma.contract.update({
        where: { contract_id: contractId },
        data: { status },
    });
};

export const payMonthlyRent = (contractId: string) => {
    return prisma.contract.update({
        where: { contract_id: contractId },
        data: {
            status: Status.ONGOING,
        },
    });
};

const isNotificationBefore30Days = (cancellationDate: Date): boolean => {
    const today = new Date();
    const daysDifference = differenceInDays(cancellationDate, today);
    return daysDifference >= 30;
};

// export const cancelContractByRenter = async (
//     contractId: number,
//     renterUserId: string,
//     cancellationDate: Date,
// ): Promise<PrismaContract> => {
//     try {
//         // Lấy thông tin hợp đồng từ cơ sở dữ liệu
//         const contract = await prisma.contract.findUnique({
//             where: { contract_id: contractId },
//         });

//         if (!contract) {
//             throw new Error('Contract not found.');
//         }

//         // Xác định thông báo trước 30 ngày
//         const notifyBefore30Days = isNotificationBefore30Days(cancellationDate);

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
//             from: renterAddress, // Đảm bảo rằng địa chỉ gọi hàm là người thuê hợp đồng
//         });

//         console.log(`Contract details on blockchain: `, rental);

//         // Kiểm tra xem renterAddress có trùng với renter trên hợp đồng không
//         if (renterAddress.toLowerCase() !== rental.renter.toLowerCase()) {
//             throw new Error('Renter address mismatch.');
//         }

//         // Kiểm tra trạng thái hợp đồng
//         if (rental.status === 3) {
//             // Assuming 3 is for Ended status
//             throw new Error('Contract has already ended.');
//         }

//         let extraCharge = 0;
//         let depositLoss = 0;

//         if (!notifyBefore30Days) {
//             // Nếu không thông báo trước 30 ngày, lấy tiền thuê hàng tháng làm extraCharge
//             extraCharge = Number(web3.utils.fromWei(rental.monthlyRent, 'wei'));

//             // Ước lượng lượng gas cần thiết
//             const gasEstimate = await rentalContract.methods
//                 .cancelContractByRenter(contractId, notifyBefore30Days)
//                 .estimateGas({
//                     from: renterAddress,
//                     value: web3.utils.toWei(extraCharge.toString(), 'wei'),
//                 });

//             // Gọi hàm cancelContractByRenter trên smart contract
//             const receipt = await rentalContract.methods.cancelContractByRenter(contractId, notifyBefore30Days).send({
//                 from: renterAddress,
//                 value: web3.utils.toWei(extraCharge.toString(), 'wei'),
//                 gas: gasEstimate.toString(),
//                 gasPrice: web3.utils.toWei('30', 'gwei').toString(),
//             });

//             // Xử lý thành công và lưu thông tin giao dịch vào cơ sở dữ liệu
//             await prisma.transaction.create({
//                 data: {
//                     contract_id: contractId,
//                     amount: extraCharge,
//                     transaction_hash: receipt.transactionHash,
//                     status: 'COMPLETED',
//                     description: 'Contract cancellation with extra charge',
//                 },
//             });

//             // Tiền cọc sẽ được chuyển cho chủ hợp đồng
//             depositLoss = Number(web3.utils.fromWei(rental.depositAmount, 'wei'));
//             await prisma.transaction.create({
//                 data: {
//                     contract_id: contractId,
//                     amount: depositLoss,
//                     transaction_hash: receipt.transactionHash,
//                     status: 'COMPLETED',
//                     description: 'Deposit transferred to owner upon contract cancellation',
//                 },
//             });
//         } else {
//             // Nếu thông báo trước 30 ngày
//             // Ước lượng lượng gas cần thiết
//             const gasEstimate = await rentalContract.methods
//                 .cancelContractByRenter(contractId, notifyBefore30Days)
//                 .estimateGas({
//                     from: renterAddress,
//                 });

//             // Gọi hàm cancelContractByRenter trên smart contract
//             const receipt = await rentalContract.methods.cancelContractByRenter(contractId, notifyBefore30Days).send({
//                 from: renterAddress,
//                 gas: gasEstimate.toString(),
//                 gasPrice: web3.utils.toWei('30', 'gwei').toString(),
//             });

//             // Xử lý hoàn trả và lưu thông tin giao dịch vào cơ sở dữ liệu
//             await prisma.transaction.create({
//                 data: {
//                     contract_id: contractId,
//                     amount: Number(web3.utils.fromWei(rental.depositAmount, 'wei')),
//                     transaction_hash: receipt.transactionHash,
//                     status: 'COMPLETED',
//                     description: 'Contract cancellation with deposit refund',
//                 },
//             });
//         }

//         // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
//         const updatedContract = await prisma.contract.update({
//             where: { contract_id: contractId },
//             data: {
//                 status: 'ENDED', // Hoặc trạng thái phù hợp với yêu cầu của bạn
//                 updated_at: new Date(),
//             },
//         });

//         // Cập nhật trạng thái property trong cơ sở dữ liệu
//         await prisma.property.update({
//             where: { property_id: contract.property_id },
//             data: {
//                 status: 'ACTIVE', // Hoặc trạng thái phù hợp với yêu cầu của bạn
//             },
//         });

//         console.log('Contract successfully cancelled by renter.');
//         return updatedContract;
//     } catch (error) {
//         console.error('Error in cancelContractByRenter:', error);
//         throw error;
//     }
// };

// export const cancelContractByOwner = async (
//     contractId: number,
//     ownerUserId: string,
//     cancellationDate: Date,
// ): Promise<PrismaContract> => {
//     try {
//         // Lấy thông tin hợp đồng từ cơ sở dữ liệu
//         const contract = await prisma.contract.findUnique({
//             where: { contract_id: contractId },
//         });

//         if (!contract) {
//             throw new Error('Contract not found.');
//         }

//         // Xác định thông báo trước 30 ngày
//         const notifyBefore30Days = isNotificationBefore30Days(cancellationDate);

//         // Lấy thông tin người chủ từ cơ sở dữ liệu
//         const owner = await prisma.user.findUnique({
//             where: { user_id: ownerUserId },
//         });

//         if (!owner || !owner.wallet_address) {
//             throw new Error('Owner not found or does not have a wallet address.');
//         }

//         const ownerAddress = owner.wallet_address.toLowerCase();

//         // Lấy thông tin hợp đồng từ hợp đồng thông minh
//         const rental: any = await rentalContract.methods.getContractDetails(contractId).call({
//             from: ownerAddress,
//         });

//         console.log(`Contract details on blockchain: `, rental);

//         // Kiểm tra xem ownerAddress có trùng với owner trên hợp đồng không
//         if (ownerAddress.toLowerCase() !== rental.owner.toLowerCase()) {
//             throw new Error('Owner address mismatch.');
//         }

//         // Kiểm tra trạng thái hợp đồng trước khi thực hiện hành động
//         if (Number(rental.status.toString()) === 3) {
//             // Assuming 3 is for Ended status
//             throw new Error('Contract has already ended.');
//         }

//         let compensation = 0;
//         let depositAmount = 0;

//         // Xác định số tiền bồi thường và tiền cọc cần hoàn trả
//         if (!notifyBefore30Days) {
//             compensation = Number(web3.utils.fromWei(rental.monthlyRent, 'wei'));
//         }

//         if (contract.status === Status.DEPOSITED || contract.status === Status.ONGOING) {
//             depositAmount = Number(web3.utils.fromWei(rental.depositAmount, 'wei'));
//         }

//         // Ước lượng gas cho việc hủy hợp đồng
//         const gasEstimate = await rentalContract.methods
//             .cancelContractByOwner(contractId, notifyBefore30Days)
//             .estimateGas({
//                 from: ownerAddress,
//                 value: web3.utils.toWei((compensation + depositAmount).toString(), 'wei'), // Tổng giá trị cần gửi
//             });

//         // Gọi hàm cancelContractByOwner trên smart contract
//         const receipt = await rentalContract.methods.cancelContractByOwner(contractId, notifyBefore30Days).send({
//             from: ownerAddress,
//             value: web3.utils.toWei((compensation + depositAmount).toString(), 'wei'),
//             gas: gasEstimate.toString(),
//             gasPrice: web3.utils.toWei('30', 'gwei').toString(),
//         });

//         // Ghi nhận giao dịch
//         await prisma.transaction.create({
//             data: {
//                 contract_id: contractId,
//                 amount: compensation + depositAmount,
//                 transaction_hash: receipt.transactionHash,
//                 status: 'COMPLETED',
//                 description: notifyBefore30Days ? 'Contract cancellation' : 'Contract cancellation with compensation',
//             },
//         });

//         // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
//         const updatedContract = await prisma.contract.update({
//             where: { contract_id: contractId },
//             data: {
//                 status: 'ENDED',
//                 updated_at: new Date(),
//             },
//         });

//         // Cập nhật trạng thái property trong cơ sở dữ liệu
//         await prisma.property.update({
//             where: { property_id: contract.property_id },
//             data: {
//                 status: 'ACTIVE', // Hoặc trạng thái phù hợp với yêu cầu của bạn
//             },
//         });

//         return updatedContract;
//     } catch (error) {
//         console.error('Error in cancelContractByOwnerService:', error);
//         throw error;
//     }
// };

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

//         // Kiểm tra quyền truy cập: người dùng có phải là chủ nhà hoặc người thuê không
//         if (userAddress !== rental.owner.toLowerCase() && userAddress !== rental.renter.toLowerCase()) {
//             throw new Error('User address does not match the contract owner or renter.');
//         }

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

export const cancelContractByRenter = (contractId: string) => {
    return prisma.contract.update({
        where: { contract_id: contractId },
        data: {
            status: Status.ENDED, // Hoặc trạng thái phù hợp với yêu cầu của bạn
        },
    });
};

export const cancelContractByOwner = async (
    contractId: string,
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
                contract_id: contractId,
                amount: compensation + depositAmount,
                transaction_hash: receipt.transactionHash,
                status: 'COMPLETED',
                title: notifyBefore30Days ? 'Contract cancellation' : 'Contract cancellation with compensation',
            },
        });

        // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
        const updatedContract = await prisma.contract.update({
            where: { contract_id: contractId },
            data: {
                status: Status.ENDED,
                updated_at: new Date(),
            },
        });

        // Cập nhật trạng thái property trong cơ sở dữ liệu
        await prisma.property.update({
            where: { property_id: contract.property_id },
            data: {
                status: PropertyStatus.ACTIVE, // Hoặc trạng thái phù hợp với yêu cầu của bạn
            },
        });

        RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
            data: {
                propertyId: contract.property_id,
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

export const endContract = async (contractId: string, userId: string): Promise<any> => {
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
                        status: Status.ENDED,
                        updated_at: new Date(),
                    },
                });

                // Cập nhật trạng thái property trong cơ sở dữ liệu
                await prisma.property.update({
                    where: { property_id: contract.property_id },
                    data: {
                        status: PropertyStatus.ACTIVE, // Hoặc trạng thái phù hợp với yêu cầu của bạn
                    },
                });

                RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
                    data: {
                        propertyId: contract.property_id,
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

            // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
            const updatedContract = await prisma.contract.update({
                where: { contract_id: contractId },
                data: {
                    status: Status.ENDED,
                    updated_at: new Date(),
                },
            });

            // Cập nhật trạng thái property trong cơ sở dữ liệu
            await prisma.property.update({
                where: { property_id: contract.property_id },
                data: {
                    status: PropertyStatus.ACTIVE, // Hoặc trạng thái phù hợp với yêu cầu của bạn
                },
            });

            RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
                data: {
                    propertyId: contract.property_id,
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

export const terminateForNonPayment = async (contractId: string, ownerId: string): Promise<PrismaContract> => {
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
                status: Status.ENDED,
                updated_at: new Date(),
            },
        });

        // Cập nhật trạng thái property trong cơ sở dữ liệu
        await prisma.property.update({
            where: { property_id: contract.property_id },
            data: {
                status: PropertyStatus.ACTIVE,
            },
        });

        RabbitMQ.getInstance().sendToQueue(CONTRACT_QUEUE.name, {
            data: {
                propertyId: contract.property_id,
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
// export const terminateForNonPayment = async (contractId: string, ownerId: string): Promise<PrismaContract> => {
//     try {
//         // Lấy thông tin hợp đồng từ cơ sở dữ liệu
//         const contract = await prisma.contract.findUnique({
//             where: { contract_id: contractId },
//         });

//         if (!contract) {
//             throw new Error('Contract not found.');
//         }

//         // Lấy thông tin người dùng từ cơ sở dữ liệu
//         const owner = await prisma.user.findUnique({
//             where: { user_id: ownerId },
//         });

//         if (!owner || !owner.wallet_address) {
//             throw new Error('Owner not found or does not have a wallet address.');
//         }

//         const ownerAddress = owner.wallet_address.toLowerCase();

//         // Gọi hàm terminateForNonPayment trên smart contract
//         const receipt = await rentalContract.methods.terminateForNonPayment(contractId).send({
//             from: ownerAddress,
//             gas: '3000000',
//             gasPrice: web3.utils.toWei('30', 'gwei').toString(),
//         });

//         // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
//         const updatedContract = await prisma.contract.update({
//             where: { contract_id: contractId },
//             data: {
//                 status: 'ENDED',
//                 updated_at: new Date(),
//             },
//         });

//         // Cập nhật trạng thái property trong cơ sở dữ liệu
//         await prisma.property.update({
//             where: { property_id: contract.property_id },
//             data: {
//                 status: 'ACTIVE', // Hoặc trạng thái phù hợp với yêu cầu của bạn
//             },
//         });

//         console.log('Contract terminated for non-payment successfully:', receipt);
//         return updatedContract;
//     } catch (error) {
//         console.error('Error in terminateForNonPayment:', error);
//         throw new Error(`Failed to terminate contract for non-payment: ${(error as Error).message}`);
//     }
// };

export const getContractTransactions = async (contractId: string, userId: string): Promise<any[]> => {
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
export const getContractDetails = async (contractId: string, userId: string): Promise<any> => {
    try {
        // Lấy thông tin hợp đồng từ cơ sở dữ liệu
        const contract = await prisma.contract.findUnique({
            where: { contract_id: contractId },
            select: {
                owner_user_id: true,
                renter_user_id: true,
                property_id: true,
                start_date: true,
                end_date: true,
                contract_terms: true,
                monthly_rent: true,
                deposit_amount: true,
                status: true,
                transaction_hash_contract: true,
                owner: {
                    select: {
                        user_id: true,
                        wallet_address: true,
                    },
                },
                renter: {
                    select: {
                        user_id: true,
                        wallet_address: true,
                    },
                },
            },
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
        let contractDetailsFromBlockchain: any = await rentalContract.methods.getContractDetails(contractId).call({
            from: userAddress,
        });

        // Kiểm tra nếu contractDetailsFromBlockchain không tồn tại hoặc không có trường depositAmount
        if (!contractDetailsFromBlockchain || typeof contractDetailsFromBlockchain.depositAmount === 'undefined') {
            throw new Error('Invalid contract details from blockchain.');
        }

        // Chuyển đổi các BigInt thành chuỗi nếu cần
        contractDetailsFromBlockchain = JSON.parse(
            JSON.stringify(contractDetailsFromBlockchain, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value,
            ),
        );

        // Kết hợp dữ liệu từ cơ sở dữ liệu và blockchain
        const combinedContractDetails = {
            contract_id: contractId,
            owner_user_id: contract.owner_user_id,
            renter_user_id: contract.renter_user_id,
            property_id: contract.property_id,
            start_date: contract.start_date,
            end_date: contract.end_date,
            contract_terms: contract.contract_terms,
            monthly_rent: contractDetailsFromBlockchain.monthlyRent,
            status: contractDetailsFromBlockchain.status, // Trạng thái từ blockchain
            deposit_amount: contractDetailsFromBlockchain.depositAmount,
            transaction_hash_contract: contract.transaction_hash_contract,
            owner_wallet_address: contract.owner.wallet_address,
            renter_wallet_address: contract.renter.wallet_address,
        };

        return combinedContractDetails;
    } catch (error) {
        console.error('Error in getContractDetails:', error);
        throw new Error(`Failed to get contract details: ${(error as Error).message}`);
    }
};

export const getContractsByOwner = (ownerId: IUserId) => {
    return prisma.contract.findMany({
        where: {
            owner_user_id: ownerId,
        },
        include: {
            renter: {
                select: {
                    avatar: true,
                    name: true,
                    user_id: true,
                },
            },
            property: {
                select: {
                    title: true,
                },
            },
        },
        orderBy: {
            created_at: 'desc',
        },
    });
};

export const getContractsByRenter = (renterId: IUserId) => {
    return prisma.contract.findMany({
        where: {
            renter_user_id: renterId,
        },
        include: {
            owner: {
                select: {
                    avatar: true,
                    name: true,
                    user_id: true,
                },
            },
            property: {
                select: {
                    title: true,
                },
            },
        },
        orderBy: {
            created_at: 'desc',
        },
    });
};

export const getContractsByStatus = (status: Status) => {
    return prisma.contract.findMany({
        where: {
            status,
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
            property_id: propertyId,
            OR: [
                {
                    AND: [
                        {
                            start_date: {
                                gte: rentalStartDate,
                            },
                        },
                        {
                            start_date: {
                                lte: rentalEndDate,
                            },
                        },
                    ],
                },
                {
                    start_date: {
                        lt: rentalStartDate,
                    },
                    end_date: {
                        gte: rentalStartDate,
                    },
                },
            ],
        },
        select: {
            property_id: true,
            start_date: true,
            end_date: true,
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
    property_id: propertyId,
    OR: [
        {
            AND: [
                {
                    start_date: {
                        gte: rentalStartDate,
                    },
                },
                {
                    start_date: {
                        lte: rentalEndDate,
                    },
                },
            ],
        },
        {
            start_date: {
                lt: rentalStartDate,
            },
            end_date: {
                gte: rentalStartDate,
            },
        },
    ],
});

export const findCancelContracts = (params: ICancelContract) => {
    return prisma.contract.findMany({
        where: getWhereCancelContracts(params),
        select: {
            contract_id: true,
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

export const cancelContractBeforeDeposit = async ({ contractId, userId }: ICancelContractBeforeDeposit) => {
    return prisma.contract.update({
        where: {
            contract_id: contractId,
            OR: [
                {
                    renter_user_id: userId,
                },
                {
                    owner_user_id: userId,
                },
            ],
        },
        data: {
            status: 'CANCELLED',
            cancelled_at: new Date(),
            cancelled_by: userId,
        },
    });
};
