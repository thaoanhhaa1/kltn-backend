// //contract.repository.ts

import Web3 from 'web3';
import { Contract as Web3Contract } from 'web3-eth-contract';
import RentalContractABI from '../../contractRental/build/contracts/RentalContract.json'; // ABI của hợp đồng
import { Contract as PrismaContract, Status } from '@prisma/client';
import prisma from '../prisma/prismaClient';
import { CreateContractReq } from '../schemas/contract.schema';
import { startOfDay, endOfDay, isSameDay, isBefore, addMonths } from 'date-fns';

// Khởi tạo Web3 và hợp đồng từ biến môi trường
const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));

const contractAddress = process.env.RENTAL_CONTRACT_ADDRESS || '0xAa143E5d268De62E550E72B42AEFCfe1Cc568147';

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
    details: string, 
    monthlyRent: number, 
    propertyId: string, 
    depositAmount: number
) => {
    try {
        const receipt = await rentalContract.methods.createContract(
            ownerAddress, // Địa chỉ chủ nhà
            renterAddress, // Địa chỉ người thuê
            startDate, // Ngày bắt đầu
            endDate, // Ngày kết thúc
            details, // Thông tin hợp đồng
            monthlyRent, // Giá thuê hàng tháng
            propertyId, // ID tài sản
            depositAmount // Số tiền đặt cọc
        ).send({ 
            from: ownerAddress, 
            gas: '3000000', 
            gasPrice: web3.utils.toWei('20', 'gwei').toString()
        });
        
        console.log("Blockchain contract created successfully:");
        console.log(receipt);

        return receipt; 
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Error creating blockchain contract:", error.message);
        } else {
            console.error("Unknown error occurred while creating blockchain contract.");
        }
        throw error;
    }
};

// Hàm tạo hợp đồng và lưu trữ vào cơ sở dữ liệu
export const createContract = async (contract: CreateContractReq): Promise<PrismaContract> => {
    const startDateTimestamp = Math.floor(contract.start_date.getTime() / 1000);
    const endDateTimestamp = Math.floor(contract.end_date.getTime() / 1000);

    // Tạo hợp đồng trên blockchain
    const blockchainReceipt = await createBlockchainContract(
        contract.owner_address,
        contract.renter_address,
        startDateTimestamp,
        endDateTimestamp,
        contract.contract_terms,
        contract.monthly_rent,
        contract.property_id,
        contract.deposit_amount
    );

    if (!blockchainReceipt.transactionHash) {
        throw new Error('Blockchain transaction hash is undefined');
    }

    // Xây dựng đối tượng dữ liệu cho Prisma
    const contractData = {
        owner_address: contract.owner_address,
        renter_address: contract.renter_address,
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
        transaction_hash_contract: blockchainReceipt.transactionHash 
    };

    // Lưu thông tin hợp đồng vào cơ sở dữ liệu
    const createdContract = await prisma.contract.create({
        data: contractData,
    });

    console.log("Contract created and saved to database successfully:");
    console.log(createdContract);

    return createdContract;
};


// Hàm thực hiện đặt cọc và cập nhật hợp đồng
export const depositAndCreateContract = async (contractId: number, renterAddress: string): Promise<PrismaContract> => {
    try {
        // Lấy thông tin hợp đồng từ cơ sở dữ liệu
        const contract = await prisma.contract.findUnique({
            where: { contract_id: contractId },
        });

        if (!contract) {
            throw new Error('Contract not found.');
        }

        const transactionHash = contract.transaction_hash_contract;

        if (!transactionHash) {
            throw new Error('Transaction hash is not available.');
        }

        // Lấy rentalIndex từ sự kiện trong giao dịch
        // const rentalIndex = await getRentalIndexFromEvent(transactionHash);
        // console.log('Rental Index:', rentalIndex);
        
        const rentalIndex = contractId - 1; // Chuyển contractId thành rentalIndex

        // Lấy thông tin hợp đồng từ hợp đồng thông minh
        const rental: any = await rentalContract.methods.getRentalDetails(rentalIndex).call();
        console.log('Rental Details:', rental);

        const depositAmount = rental.depositAmount;

        // Kiểm tra xem renterAddress có trùng với renter trên hợp đồng không
        if (renterAddress !== rental.renter) {
            throw new Error('Renter address mismatch.');
        }

        // Ước lượng lượng gas cần thiết
        const gasEstimate = await rentalContract.methods.depositAndCreateContract(rentalIndex).estimateGas({
            from: renterAddress,
            value: depositAmount,
        });
        console.log('Estimated Gas:', gasEstimate);

        // Gọi hàm depositAndCreateContract trên smart contract
        const receipt = await rentalContract.methods.depositAndCreateContract(rentalIndex).send({
            from: renterAddress,
            value: depositAmount,
            gas: gasEstimate.toString(),
            gasPrice: web3.utils.toWei('30', 'gwei').toString()
        });
        console.log('Transaction receipt:', receipt);

        // Lấy thông tin hợp đồng từ blockchain sau khi giao dịch đặt cọc
        const rentalDetails: any = await rentalContract.methods.getRentalDetails(rentalIndex).call();
        console.log('Updated Rental Details:', rentalDetails);

         // Chuyển đổi BigInt thành kiểu number hoặc float
        const amountAsFloat = Number(depositAmount);

         // Lưu thông tin giao dịch vào cơ sở dữ liệu
        await prisma.transaction.create({
             data: {
                 contract_id: contractId,
                 amount: amountAsFloat,
                 transaction_hash: receipt.transactionHash,
                 status: 'COMPLETED',
                 description: 'Deposit and contract creation',
             },
         });

        // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
        const updatedContract = await prisma.contract.update({
            where: { contract_id: contractId },
            data: { 
                status: Status.ACCEPTED,
                updated_at: new Date() // Cập nhật thời gian
            }
        });
        console.log('Updated Contract:', updatedContract);

        return updatedContract;
    } catch (error) {
        console.error('Error in depositAndCreateContract:', error);
        throw error;
    }
};

export const payMonthlyRent = async (contractId: number, renterAddress: string): Promise<PrismaContract> => {
    try {
        // Lấy thông tin hợp đồng từ cơ sở dữ liệu
        const contract = await prisma.contract.findUnique({
            where: { contract_id: contractId },
        });

        if (!contract) {
            throw new Error('Contract not found.');
        }

        const rentalIndex = contractId - 1;

        // Lấy thông tin hợp đồng từ hợp đồng thông minh
        const rental: any = await rentalContract.methods.getRentalDetails(rentalIndex).call();

        // Kiểm tra xem renterAddress có trùng với renter trên hợp đồng không
        if (renterAddress.toLowerCase() !== rental.renter.toLowerCase()) {
            throw new Error('Renter address mismatch.');
        }

        const currentTime = new Date();

        // Kiểm tra lịch sử giao dịch xem đã có thanh toán nào trong ngày chưa
        const existingPaymentToday = await prisma.transaction.findFirst({
            where: {
                contract_id: contractId,
                created_at: {
                    gte: startOfDay(currentTime), // Tìm các giao dịch từ đầu ngày hiện tại
                    lt: endOfDay(currentTime), // Cho đến cuối ngày hiện tại
                },
                description: 'Monthly rent payment',
            },
        });

        if (existingPaymentToday) {
            throw new Error('Rent payment already made for today.');
        }

        const startDate = new Date(Number(rental.startDate) * 1000);

        const RENTAL_STATUS_NOT_CREATED = 0;
        const RENTAL_STATUS_ENDED = 3;

        if (rental.status === RENTAL_STATUS_NOT_CREATED || rental.status === RENTAL_STATUS_ENDED) {
            throw new Error('Rental period not started or already ended.');
        }

        // Kiểm tra số tiền thuê hàng tháng có chính xác không
        if (web3.utils.toWei(contract.monthly_rent.toString(), 'wei') !== rental.monthlyRent.toString()) {
            throw new Error('Incorrect rent amount.');
        }

        // Tính toán ngày thanh toán tiếp theo
        let nextPaymentDate = startDate;
        while (isBefore(nextPaymentDate, currentTime)) {
            nextPaymentDate = addMonths(nextPaymentDate, 1);
        }

        // Nếu ngày thanh toán trùng với ngày bắt đầu hợp đồng, cho phép thanh toán
        if (isSameDay(currentTime, startDate)) {
            nextPaymentDate = startDate;
        }

        // Kiểm tra xem hôm nay có phải là ngày thanh toán không
        if (!isSameDay(currentTime, nextPaymentDate) && isBefore(currentTime, nextPaymentDate)) {
            throw new Error('Not yet time for the next rent payment.');
        }

        // Ước lượng lượng gas cần thiết
        const gasEstimate = await rentalContract.methods.payRent(rentalIndex).estimateGas({
            from: renterAddress,
            value: rental.monthlyRent,
        });

        // Gọi hàm payRent trên smart contract
        const receipt = await rentalContract.methods.payRent(rentalIndex).send({
            from: renterAddress,
            value: rental.monthlyRent,
            gas: gasEstimate.toString(),
            gasPrice: web3.utils.toWei('30', 'gwei').toString(),
        });

        // Chuyển đổi BigInt thành kiểu number hoặc float
        const amountAsFloat = Number(rental.monthlyRent);

        // Lưu thông tin giao dịch vào cơ sở dữ liệu
        await prisma.transaction.create({
            data: {
                contract_id: contractId,
                amount: amountAsFloat,
                transaction_hash: receipt.transactionHash,
                status: 'COMPLETED',
                description: 'Monthly rent payment',
            },
        });

        // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu sau khi thanh toán thành công
        const updatedContract = await prisma.contract.update({
            where: { contract_id: contractId },
            data: {
                updated_at: new Date(), // Cập nhật thời gian
                status: 'REJECTED', // Cập nhật trạng thái thành ONGOING sau khi thanh toán thành công
            }
        });

        return updatedContract;
    } catch (error) {
        console.error('Error in payMonthlyRent:', error);
        throw error;
    }
};


// Hàm hủy hợp đồng bởi người thuê
export const cancelContractByRenter = async (contractId: number, renterAddress: string, notifyBefore30Days: boolean): Promise<PrismaContract> => {
    try {
        // Lấy thông tin hợp đồng từ cơ sở dữ liệu
        const contract = await prisma.contract.findUnique({
            where: { contract_id: contractId },
        });

        if (!contract) {
            throw new Error('Contract not found.');
        }

        // Kiểm tra trạng thái hợp đồng và địa chỉ người thuê
        if (contract.status !== 'ACCEPTED') {
            throw new Error('Contract is not in deposited status.');
        }

        const rentalIndex = contractId - 1; // Chuyển contractId thành rentalIndex

        // Lấy thông tin hợp đồng từ hợp đồng thông minh
        const rental: any = await rentalContract.methods.getRentalDetails(rentalIndex).call();
        console.log('Rental Details:', rental);

        // Kiểm tra xem renterAddress có trùng với renter trên hợp đồng không
        if (renterAddress.toLowerCase() !== rental.renter.toLowerCase()) {
            throw new Error('Renter address mismatch.');
        }

        const depositAmount = rental.depositAmount;
        const monthlyRent = rental.monthlyRent;

        let depositLoss = 0;
        let extraCharge = 0;

        if (!notifyBefore30Days) {
            // Nếu không thông báo trước 30 ngày
            extraCharge = monthlyRent;

            // Thực hiện giao dịch chuyển tiền bổ sung cho chủ nhà
            const extraChargeReceipt = await web3.eth.sendTransaction({
                from: renterAddress,
                to: rental.owner,
                value: web3.utils.toWei(extraCharge.toString(), 'wei'),
            });
            console.log('Extra Charge Transaction receipt:', extraChargeReceipt);

            // Thực hiện giao dịch chuyển tiền cọc cho chủ nhà
            depositLoss = depositAmount;
            const depositLossReceipt = await web3.eth.sendTransaction({
                from: renterAddress,
                to: rental.owner,
                value: web3.utils.toWei(depositLoss.toString(), 'wei'),
            });
            console.log('Deposit Loss Transaction receipt:', depositLossReceipt);
        } else {
            // Nếu thông báo trước 30 ngày, hoàn lại tiền cọc cho người thuê
            const refundReceipt = await web3.eth.sendTransaction({
                from: rental.owner,
                to: renterAddress,
                value: web3.utils.toWei(depositAmount.toString(), 'wei'),
            });
            console.log('Refund Transaction receipt:', refundReceipt);
        }

        // Cập nhật trạng thái hợp đồng trong cơ sở dữ liệu
        const updatedContract = await prisma.contract.update({
            where: { contract_id: contractId },
            data: {
                status: 'CANCELLED', // Hoặc trạng thái kết thúc khác
                updated_at: new Date(),
            },
        });
        console.log('Updated Contract:', updatedContract);

        // Emit sự kiện nếu cần thiết
        // ...

        return updatedContract;
    } catch (error) {
        console.error('Error in cancelContractByRenter:', error);
        throw error;
    }
};


