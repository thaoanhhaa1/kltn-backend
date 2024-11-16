import Web3 from 'web3';
import envConfig from './env.config';

const web3 = new Web3(new Web3.providers.HttpProvider(envConfig.GANACHE_URL));

(envConfig.HOLESKY_PRIVATE_KEY || '').split(',').forEach(async (privateKey) => {
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);

    // Add account to wallet
    web3.eth.accounts.wallet.add(account);

    // Get account balance
    const balance = await web3.eth.getBalance(account.address);
    console.log(`Account ${account.address} added with balance: ${web3.utils.fromWei(balance, 'ether')} ETH`);
});

export default web3;
