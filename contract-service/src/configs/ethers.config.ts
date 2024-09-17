// src/configs/ethers.config.ts
import { ethers } from 'ethers';
import envConfig from './env.config';

const provider = new ethers.JsonRpcProvider(envConfig.GANACHE_URL); // Địa chỉ RPC của Ethereum

export { provider };
