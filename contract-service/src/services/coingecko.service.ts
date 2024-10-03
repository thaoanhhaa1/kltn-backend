import envConfig from '../configs/env.config';
import Redis from '../configs/redis.config';

export const getCoinPriceService = async () => {
    try {
        const res = await Redis.getInstance().getClient().get(`coin-eth-vnd`);

        if (res) return parseFloat(res);

        const response = await fetch(envConfig.BIT_GET_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fiat: 'VND',
                includeFiatRate: true,
                languageType: 0,
                name: 'Ethereum',
                normalizedName: 'ethereum',
            }),
        });
        const result = await response.json();
        const price = Math.round(result.data.fiatExchangeRate.usdRate * result.data.price);
        console.log('🚀 ~ getCoinPriceService ~ price:', price);

        Redis.getInstance().getClient().set(`coin-eth-vnd`, price, {
            ex: 60, // 1 minute
            type: 'number',
        });

        return price;
    } catch (error) {
        console.error('Error getCoinPriceService:', error);
        throw error;
    }
};
