import fetch from 'node-fetch';
import envConfig from '../configs/env.config';
import { IGetCoinPrice } from '../interfaces/coingecko';

export const getCoinPriceService = async ({ coin, currency }: IGetCoinPrice) => {
    const url = `${envConfig.COINGECKO_ENDPOINT}/simple/price?ids=${coin}&vs_currencies=${currency}`;
    const options = {
        method: 'GET',
        headers: { accept: 'application/json', 'x-cg-demo-api-key': envConfig.COINGECKO_API_KEY },
    };

    const response = await fetch(url, options);
    const data = await response.json();

    return data?.[coin]?.[currency] ?? 0;
};
