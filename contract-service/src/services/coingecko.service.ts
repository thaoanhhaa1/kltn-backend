import CoinGecko from 'coingecko-api';
import Redis from '../configs/redis.config';
import { IGetCoinPrice } from '../interfaces/coingecko';

const CoinGeckoClient = new CoinGecko();

export const getCoinPriceService = async ({ coin, currency }: IGetCoinPrice) => {
    try {
        const res = await Redis.getInstance().getClient().get(`coin-eth-vnd`);

        if (res) return parseFloat(res);

        const result = await CoinGeckoClient.simple.price({
            ids: coin,
            vs_currencies: currency,
        });

        Redis.getInstance().getClient().set(`coin-eth-vnd`, result.data[coin][currency], {
            ex: 60, // 1 minute
            type: 'number',
        });

        return result.data[coin][currency];
    } catch (error) {
        console.error('Error getCoinPriceService:', error);
        throw error;
    }
};
