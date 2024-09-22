import envConfig from '../configs/env.config';
import Redis from '../configs/redis.config';
import { IGetCoinPrice } from '../interfaces/coingecko';

export const getCoinPriceService = async ({ coin, currency }: IGetCoinPrice) => {
    try {
        const res = await Redis.getInstance().getClient().get(`coin-eth-vnd`);

        if (res) return parseFloat(res);

        const url = `${envConfig.COINGECKO_ENDPOINT}/simple/price?ids=${coin}&vs_currencies=${currency}`;
        const options = {
            method: 'GET',
            // headers: { accept: 'application/json', 'x-cg-demo-api-key': envConfig.COINGECKO_API_KEY },
        };

        const response = await fetch(url, options);
        console.log('🚀 ~ getCoinPriceService ~ response:', response);
        const data = await response.text();
        console.log('🚀 ~ getCoinPriceService ~ data:', data);

        // Redis.getInstance()
        //     .getClient()
        //     .set(`coin-eth-vnd`, data?.[coin]?.[currency] ?? 0, {
        //         ex: 60, // 1 phút
        //         type: 'double',
        //     })
        //     .then(() => {
        //         console.log('Set redis cache');
        //     })
        //     .catch((err: any) => {
        //         console.error('Error setting redis cache:', err);
        //     });

        // return data?.[coin]?.[currency] ?? 0;
        return 0;
    } catch (error) {
        console.error('Error getCoinPriceService:', error);
        throw error;
    }
};
