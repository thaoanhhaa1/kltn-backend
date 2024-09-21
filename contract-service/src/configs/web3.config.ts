import Web3 from 'web3';
import envConfig from './env.config';

const web3 = new Web3(new Web3.providers.HttpProvider(envConfig.GANACHE_URL));

export default web3;
