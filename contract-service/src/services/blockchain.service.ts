import RentalContractABI from '../../contractRental/build/contracts/RentalContract.json'; // ABI của hợp đồng
import envConfig from '../configs/env.config';
import web3 from '../configs/web3.config';
import { IContract } from '../interfaces/contract';

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
