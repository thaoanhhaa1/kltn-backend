import RentalContractABI from '../../contractRental/build/contracts/RentalContract.json'; // ABI của hợp đồng
import envConfig from '../configs/env.config';
import web3 from '../configs/web3.config';
import { IContract, IContractId } from '../interfaces/contract';
import { IUserId } from '../interfaces/user';
import { getCompensationTransaction } from '../repositories/transaction.repository';
import { findUserById } from '../repositories/user.repository';
import convertVNDToWei from '../utils/convertVNDToWei.util';
import CustomError from '../utils/error.util';
import { getGasPriceInfuraService } from './coingecko.service';

const contractAddress = envConfig.RENTAL_CONTRACT_ADDRESS;

const rentalContract = new web3.eth.Contract(RentalContractABI.abi as any, contractAddress);

export const verifyMessageSignedService = ({
    address,
    message,
    signature,
}: {
    message: string;
    signature: string;
    address: string;
}) => {
    console.log('🚀 ~ address:', address);
    const recoveredAddress = web3.eth.accounts.recover(message, signature);
    console.log('🚀 ~ message:', message);
    console.log('🚀 ~ recoveredAddress:', recoveredAddress);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase())
        throw new CustomError(400, 'Xác thực chữ ký không thành công.');
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
    depositAmountEth,
}: {
    contractId: string;
    userAddress: string;
    notifyBefore30Days: boolean;
    depositAmountEth: number;
}) => {
    const rental: any = await rentalContract.methods.getContractDetails(contractId).call({
        from: userAddress,
    });

    console.log(`Contract details on blockchain: `, rental);

    const rentalStatus = parseInt(rental.status, 10);

    if (rentalStatus === 3) throw new CustomError(400, 'Hợp đồng đã kết thúc.');

    const depositAmountInWei = web3.utils.toWei(depositAmountEth.toString(), 'ether');

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
    depositAmountEth,
}: {
    renterAddress: string;
    contractId: string;
    userAddress: string;
    notifyBefore30Days: boolean;
    depositAmountEth: number;
}) => {
    const rental: any = await rentalContract.methods.getContractDetails(contractId).call({
        from: userAddress,
    });

    console.log(`Contract details on blockchain: `, rental);

    const rentalStatus = parseInt(rental.status, 10);

    if (rentalStatus === 3) throw new CustomError(400, 'Hợp đồng đã kết thúc.');

    const depositAmountInWei = web3.utils.toWei(depositAmountEth.toString(), 'ether');

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

export const endSmartContractService = async ({
    contractId,
    depositAmountEth,
    userAddress,
}: {
    contractId: IContractId;
    userAddress: string;
    depositAmountEth: number;
}) => {
    const depositAmountInWei = web3.utils.toWei(depositAmountEth.toString(), 'ether');

    const endContract = rentalContract.methods.endContract(contractId, depositAmountInWei);

    const [gasEstimate, gasPrice] = await Promise.all([
        endContract.estimateGas({
            from: userAddress,
        }),
        getGasPriceInfuraService(),
    ]);

    return endContract.send({
        from: userAddress,
        gas: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
    });
};

export const transferAddressToAddressService = async ({
    amount,
    contractId,
    description,
    receiverAddress,
    senderAddress,
}: {
    contractId: string;
    senderAddress: string;
    receiverAddress: string;
    amount: number;
    description: string;
}) => {
    const amountInWei = await convertVNDToWei(amount);

    const transferMethod = rentalContract.methods.transferAddressToAddress(contractId, receiverAddress, description);

    const [gasEstimate, gasPrice] = await Promise.all([
        transferMethod.estimateGas({
            from: senderAddress,
            value: amountInWei,
        }),
        getGasPriceInfuraService(),
    ]);

    return transferMethod.send({
        from: senderAddress,
        value: amountInWei,
        gas: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
    });
};

export const getBalanceService = async (userId: IUserId) => {
    const user = await findUserById(userId);

    if (!user?.walletAddress) throw new CustomError(400, 'Không tìm thấy địa chỉ ví của người dùng.');

    const balanceInWei = await web3.eth.getBalance(user.walletAddress);

    const balance = web3.utils.fromWei(String(Number(balanceInWei)), 'ether');

    return balance;
};
