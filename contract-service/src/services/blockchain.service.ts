import RentalContractABI from '../../contractRental/build/contracts/RentalContract.json'; // ABI của hợp đồng
import envConfig from '../configs/env.config';
import Redis from '../configs/redis.config';
import web3 from '../configs/web3.config';
import { IContract } from '../interfaces/contract';
import { getCompensationTransaction } from '../repositories/transaction.repository';
import convertVNDToWei from '../utils/convertVNDToWei.util';
import CustomError from '../utils/error.util';
import { getGasPriceInfuraService } from './coingecko.service';

const contractAddress = envConfig.RENTAL_CONTRACT_ADDRESS;

const rentalContract = new web3.eth.Contract(RentalContractABI.abi as any, contractAddress);

const getGasPriceService = async () => {
    const gasPriceInRedis = await Redis.getInstance().getClient().get('gasPrice');

    if (gasPriceInRedis) return gasPriceInRedis;

    const gasPrice = Number(await web3.eth.getGasPrice());

    Redis.getInstance()
        .getClient()
        .set('gasPrice', gasPrice, {
            ex: 15, // 10 seconds
            type: 'number',
        })
        .then(() => console.log('Gas price has been saved to Redis.'))
        .catch((err: any) => console.error('Failed to save gas price to Redis.', err));

    return gasPrice;
};

export const convertGasToEthService = async (gas: number) => {
    const gasPrice = await getGasPriceInfuraService();
    return web3.utils.fromWei((gas * parseInt(`${Number(gasPrice)}`, 10)).toString(), 'ether');
};

export const createSmartContractService = async ({
    contractId,
    propertyId,
    ownerWalletAddress,
    renterWalletAddress,
    depositAmount,
    monthlyRent,
}: IContract) => {
    const contractCreate = rentalContract.methods.createContract(
        contractId,
        propertyId,
        ownerWalletAddress,
        renterWalletAddress,
        depositAmount,
        monthlyRent,
    );

    const [gasEstimate, gasPrice] = await Promise.all([
        contractCreate.estimateGas({ from: ownerWalletAddress }),
        getGasPriceInfuraService(),
    ]);

    // Tạo hợp đồng trên blockchain
    const receipt = await contractCreate.send({
        from: ownerWalletAddress,
        gas: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
    });

    return receipt;
};

export const depositSmartContractService = async ({
    contractId,
    renterAddress,
}: {
    contractId: string;
    renterAddress: string;
}) => {
    const contract: any = await rentalContract.methods.getContractDetails(contractId).call({
        from: renterAddress,
    });
    console.log('contract.depositAmount', contract.depositAmount);

    const depositAmountInWei = await convertVNDToWei(Number(contract.depositAmount));

    // Kiểm tra số dư của người thuê
    const renterBalance = await web3.eth.getBalance(renterAddress);
    if (Number(renterBalance) < Number(depositAmountInWei))
        throw new CustomError(400, 'Số dư không đủ để thanh toán số tiền đặt cọc.');

    // Ước lượng lượng gas cần thiết
    const [gasEstimate, gasPrice] = await Promise.all([
        rentalContract.methods.deposit(contractId).estimateGas({
            from: renterAddress,
            value: depositAmountInWei,
        }),
        getGasPriceInfuraService(),
    ]);
    console.log('Estimated Gas:', gasEstimate);

    // Gọi hàm deposit trên smart contract
    const receipt = await rentalContract.methods.deposit(contractId).send({
        from: renterAddress,
        value: depositAmountInWei,
        gas: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
    });
    console.log('Transaction receipt:', receipt);

    return receipt;
};

export const payMonthlyRentSmartContractService = async ({
    contractId,
    renterAddress,
}: {
    contractId: string;
    renterAddress: string;
}) => {
    const rental: any = await rentalContract.methods.getContractDetails(contractId).call({
        from: renterAddress,
    });

    const rentalStatus = parseInt(rental.status, 10);

    if (rentalStatus === 0 || rentalStatus === 3)
        throw new CustomError(400, 'Chưa đến thời gian thanh toán hoặc hợp đồng đã kết thúc.');

    const monthlyRentInWei = await convertVNDToWei(Number(rental.monthlyRent));

    // Kiểm tra số dư của người thuê
    const renterBalance = await web3.eth.getBalance(renterAddress);
    if (Number(renterBalance) < Number(monthlyRentInWei))
        throw new CustomError(400, 'Số dư không đủ để thanh toán tiền thuê.');

    // Ước lượng lượng gas cần thiết
    const [gasEstimate, gasPrice] = await Promise.all([
        rentalContract.methods.payRent(contractId).estimateGas({
            from: renterAddress,
            value: monthlyRentInWei,
        }),
        getGasPriceInfuraService(),
    ]);
    console.log('🚀 ~ gasEstimate ~ gasEstimate:', gasEstimate);

    // Gọi hàm payRent trên smart contract
    const receipt = await rentalContract.methods.payRent(contractId).send({
        from: renterAddress,
        value: monthlyRentInWei,
        gas: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
    });
    console.log('🚀 ~ receipt ~ receipt:', receipt);

    return receipt;
};

export const cancelSmartContractByRenterService = async ({
    contractId,
    userAddress,
    notifyBefore30Days,
}: {
    contractId: string;
    userAddress: string;
    notifyBefore30Days: boolean;
}) => {
    const rental: any = await rentalContract.methods.getContractDetails(contractId).call({
        from: userAddress,
    });

    console.log(`Contract details on blockchain: `, rental);

    const rentalStatus = parseInt(rental.status, 10);

    if (rentalStatus === 3) throw new CustomError(400, 'Hợp đồng đã kết thúc.');

    const depositAmountInWei = await convertVNDToWei(Number(rental.depositAmount));

    const cancelContract = rentalContract.methods.cancelContractByRenter(
        contractId,
        notifyBefore30Days,
        depositAmountInWei,
    );

    const [gasEstimate, gasPrice] = await Promise.all([
        cancelContract.estimateGas({
            from: userAddress,
        }),
        getGasPriceInfuraService(),
    ]);

    const receipt = await cancelContract.send({
        from: userAddress,
        gas: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
    });

    return {
        receipt,
        smartContract: rental,
        indemnity: null,
        indemnityEth: null,
    };
};

export const cancelSmartContractByOwnerService = async ({
    renterAddress,
    contractId,
    userAddress,
    notifyBefore30Days,
}: {
    renterAddress: string;
    contractId: string;
    userAddress: string;
    notifyBefore30Days: boolean;
}) => {
    const rental: any = await rentalContract.methods.getContractDetails(contractId).call({
        from: userAddress,
    });

    console.log(`Contract details on blockchain: `, rental);

    const rentalStatus = parseInt(rental.status, 10);

    if (rentalStatus === 3) throw new CustomError(400, 'Hợp đồng đã kết thúc.');

    const [depositAmountInWei, value] = await Promise.all([
        convertVNDToWei(Number(rental.depositAmount)),
        convertVNDToWei(Number(rental.depositAmount) + Number(notifyBefore30Days ? 0 : rental.monthlyRent)),
    ]);

    const transaction = await getCompensationTransaction(contractId);
    const monthlyRentInWei = transaction?.amountEth ? web3.utils.toWei(transaction.amountEth.toString(), 'ether') : 0;

    const transferMethod = rentalContract.methods.transferToAddress(contractId, renterAddress, monthlyRentInWei);

    const cancelContract = rentalContract.methods.cancelContractByOwner(contractId, depositAmountInWei);

    const [gasEstimate, gasEstimateIndemnity, gasPrice] = await Promise.all([
        cancelContract.estimateGas({
            from: userAddress,
        }),
        transferMethod.estimateGas({
            from: userAddress,
        }),
        getGasPriceInfuraService(),
        getCompensationTransaction(contractId),
    ]);

    let indemnity = null;

    console.log('notifyBefore30Days', notifyBefore30Days);

    if (!notifyBefore30Days) {
        console.log('transaction::', transaction);
        if (!transaction) throw new CustomError(400, 'Không tìm thấy giao dịch bồi thường.');

        indemnity = await transferMethod.send({
            from: userAddress,
            gas: gasEstimateIndemnity.toString(),
            gasPrice: gasPrice.toString(),
        });
        console.log('🚀 ~ indemnity:', indemnity);
    }

    const receipt = await cancelContract.send({
        from: userAddress,
        gas: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
    });
    console.log('🚀 ~ receipt:', receipt);

    return {
        receipt,
        smartContract: rental,
        indemnity,
        indemnityEth: transaction?.amountEth,
    };
};

export const cancelSmartContractBeforeDepositService = async ({
    contractId,
    userAddress,
}: {
    contractId: string;
    userAddress: string;
}) => {
    const cancelContract = rentalContract.methods.cancelContractBeforeDeposit(contractId);

    const [gasEstimate, gasPrice] = await Promise.all([
        cancelContract.estimateGas({
            from: userAddress,
        }),
        getGasPriceInfuraService(),
    ]);

    return cancelContract.send({
        from: userAddress,
        gas: gasEstimate.toString(),
        gasPrice: gasPrice,
    });
};

export const transferToSmartContractService = async ({
    contractId,
    senderAddress,
    amount,
}: {
    contractId: string;
    senderAddress: string;
    amount: number;
}) => {
    console.log('🚀 ~ senderAddress:', senderAddress);
    const transferMethod = rentalContract.methods.transferToSmartContract(contractId);

    const amountInWei = await convertVNDToWei(Number(amount));

    const [gasEstimate, gasPrice] = await Promise.all([
        transferMethod.estimateGas({
            from: senderAddress,
            value: amountInWei,
        }),
        getGasPriceInfuraService(),
    ]);

    const receipt = await transferMethod.send({
        from: senderAddress,
        value: amountInWei,
        gas: gasEstimate.toString(),
        gasPrice: gasPrice.toString(), // đơn vị wei
    });

    return receipt;
};
