import RentalContractABI from '../../contractRental/build/contracts/RentalContract.json'; // ABI của hợp đồng
import envConfig from '../configs/env.config';
import Redis from '../configs/redis.config';
import web3 from '../configs/web3.config';
import { IContract } from '../interfaces/contract';
import convertVNDToWei from '../utils/convertVNDToWei.util';
import CustomError from '../utils/error.util';

const contractAddress = envConfig.RENTAL_CONTRACT_ADDRESS;

const rentalContract = new web3.eth.Contract(RentalContractABI.abi as any, contractAddress);

const getGasPriceService = async () => {
    const gasPriceInRedis = await Redis.getInstance().getClient().get('gasPrice');

    if (gasPriceInRedis) return gasPriceInRedis;

    const gasPrice = Number(await web3.eth.getGasPrice());

    Redis.getInstance()
        .getClient()
        .set('gasPrice', gasPrice, {
            ex: 10, // 10 seconds
            type: 'number',
        })
        .then(() => console.log('Gas price has been saved to Redis.'))
        .catch((err: any) => console.error('Failed to save gas price to Redis.', err));

    return gasPrice;
};

export const convertGasToEthService = async (gas: number) => {
    const gasPrice = await getGasPriceService();
    return web3.utils.fromWei((gas * parseInt(`${Number(gasPrice)}`, 10)).toString(), 'ether');
};

export const createSmartContractService = async ({
    contract_id,
    property_id,
    owner_wallet_address,
    renter_wallet_address,
    deposit_amount,
    monthly_rent,
}: IContract) => {
    const contractCreate = rentalContract.methods.createContract(
        contract_id,
        property_id,
        owner_wallet_address,
        renter_wallet_address,
        deposit_amount,
        monthly_rent,
    );

    const [gasEstimate, gasPrice] = await Promise.all([
        contractCreate.estimateGas({ from: owner_wallet_address }),
        getGasPriceService(),
    ]);

    // Tạo hợp đồng trên blockchain
    const receipt = await contractCreate.send({
        from: owner_wallet_address,
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
        getGasPriceService(),
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
        getGasPriceService(),
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
        getGasPriceService(),
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
    };
};

export const cancelSmartContractByOwnerService = async ({
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

    const [depositAmountInWei, monthlyRentInWei, value] = await Promise.all([
        convertVNDToWei(Number(rental.depositAmount)),
        convertVNDToWei(Number(rental.monthlyRent)),
        convertVNDToWei(Number(rental.depositAmount) + Number(notifyBefore30Days ? 0 : rental.monthlyRent)),
    ]);

    const contractualIndemnity = rentalContract.methods.contractualIndemnity(contractId);

    const cancelContract = rentalContract.methods.cancelContractByOwner(contractId, depositAmountInWei);

    const [gasEstimate, gasEstimateIndemnity, gasPrice] = await Promise.all([
        cancelContract.estimateGas({
            from: userAddress,
        }),
        contractualIndemnity.estimateGas({
            value: monthlyRentInWei,
            from: userAddress,
        }),
        getGasPriceService(),
    ]);

    let indemnity = null;

    console.log('notifyBefore30Days', notifyBefore30Days);

    if (!notifyBefore30Days) {
        indemnity = await contractualIndemnity.send({
            value: monthlyRentInWei,
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
        getGasPriceService(),
    ]);

    return cancelContract.send({
        from: userAddress,
        gas: gasEstimate.toString(),
        gasPrice: gasPrice,
    });
};
