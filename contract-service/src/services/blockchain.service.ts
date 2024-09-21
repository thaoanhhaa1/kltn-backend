import RentalContractABI from '../../contractRental/build/contracts/RentalContract.json'; // ABI của hợp đồng
import envConfig from '../configs/env.config';
import web3 from '../configs/web3.config';
import { IContract } from '../interfaces/contract';
import convertVNDToWei from '../utils/convertVNDToWei.util';
import CustomError from '../utils/error.util';

const contractAddress = envConfig.RENTAL_CONTRACT_ADDRESS;

const rentalContract = new web3.eth.Contract(RentalContractABI.abi as any, contractAddress);

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

    const gasEstimate = await contractCreate.estimateGas({ from: owner_wallet_address });

    // Tạo hợp đồng trên blockchain
    const receipt = await contractCreate.send({
        from: owner_wallet_address,
        gas: gasEstimate.toString(),
        gasPrice: web3.utils.toWei('30', 'gwei').toString(),
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
    const gasEstimate = await rentalContract.methods.deposit(contractId).estimateGas({
        from: renterAddress,
        value: depositAmountInWei,
    });
    console.log('Estimated Gas:', gasEstimate);

    // Gọi hàm deposit trên smart contract
    const receipt = await rentalContract.methods.deposit(contractId).send({
        from: renterAddress,
        value: depositAmountInWei,
        gas: gasEstimate.toString(),
        gasPrice: web3.utils.toWei('30', 'gwei').toString(),
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
    const gasEstimate = await rentalContract.methods.payRent(contractId).estimateGas({
        from: renterAddress,
        value: monthlyRentInWei,
    });
    console.log('🚀 ~ gasEstimate ~ gasEstimate:', gasEstimate);

    // Gọi hàm payRent trên smart contract
    const receipt = await rentalContract.methods.payRent(contractId).send({
        from: renterAddress,
        value: monthlyRentInWei,
        gas: gasEstimate.toString(),
        gasPrice: web3.utils.toWei('30', 'gwei').toString(),
    });
    console.log('🚀 ~ receipt ~ receipt:', receipt);

    return receipt;
};

export const cancelSmartContractByRenterService = async ({
    contractId,
    renterAddress,
    notifyBefore30Days,
}: {
    contractId: string;
    renterAddress: string;
    notifyBefore30Days: boolean;
}) => {
    const rental: any = await rentalContract.methods.getContractDetails(contractId).call({
        from: renterAddress,
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

    const gasEstimate = await cancelContract.estimateGas({
        from: renterAddress,
    });

    const receipt = await cancelContract.send({
        from: renterAddress,
        gas: gasEstimate.toString(),
        gasPrice: web3.utils.toWei('30', 'gwei').toString(),
    });

    return receipt;
};
