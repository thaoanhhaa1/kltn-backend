import envConfig from '../configs/env.config';
import Redis from '../configs/redis.config';
import CustomError from '../utils/error.util';

const getETHFromBitGet = async () => {
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

    if (!response.ok) throw new CustomError(500, 'Error getETHFromBitGet');

    const result = await response.json();
    const price = Math.round(result.data.fiatExchangeRate.usdRate * result.data.price);

    return price;
};

const getETHFromBitKan = async () => {
    const response = await fetch(envConfig.BIT_KAN_API);

    if (!response.ok) throw new Error('Error getETHFromBitKan');

    const result = await response.json();

    return (1 / result.data.ETH) * result.data.VND;
};

export const getCoinPriceService = async () => {
    try {
        const res = await Redis.getInstance().getClient().get(`coin-eth-vnd`);
        console.log('🚀 ~ getCoinPriceService ~ from redis:', res);

        if (res) return parseFloat(res);

        const [priceBitGet, priceBitKan] = await Promise.allSettled([getETHFromBitGet(), getETHFromBitKan()]);

        const price =
            priceBitGet.status === 'fulfilled'
                ? priceBitGet.value
                : priceBitKan.status === 'fulfilled'
                ? priceBitKan.value
                : -1;

        if (price === -1) throw new CustomError(500, 'Error getCoinPriceService');

        Redis.getInstance()
            .getClient()
            .set(`coin-eth-vnd`, price, {
                ex: 60, // 1 minute
                type: 'number',
            })
            .then(() => console.log('Coin price has been saved to Redis.'))
            .catch((error: any) => {
                console.error('Error set redis:', error);
            });

        return price;
    } catch (error) {
        console.error('Error getCoinPriceService:', error);
        throw error;
    }
};
