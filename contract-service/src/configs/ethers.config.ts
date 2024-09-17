// src/configs/ethers.config.ts
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('http://localhost:7545'); // Địa chỉ RPC của Ethereum

export { provider };
