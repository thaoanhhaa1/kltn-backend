import envConfig from '../configs/env.config';
import Redis from '../configs/redis.config';
import web3 from '../configs/web3.config';
import CustomError from '../utils/error.util';

export const getGasPriceInfuraService = async () => {
    const gasPriceInRedis = await Redis.getInstance().getClient().get('gasPrice');
    console.log('🚀 ~ getGasPriceInfuraService ~ gasPriceInRedis:', gasPriceInRedis);

    if (gasPriceInRedis) return gasPriceInRedis;

    const response = await fetch(
        `https://gas.api.infura.io/v3/${envConfig.INFURA_API_KEY}/networks/${envConfig.CHAIN_ID}/suggestedGasFees`,
    );

    if (!response.ok) throw new CustomError(500, 'Error getGasPriceInfuraService');

    const result = await response.json();

    const gasPrice =
        Number(result.medium.suggestedMaxFeePerGas) + Number(result.estimatedBaseFee) * result.networkCongestion; // gwei
    console.log('🚀 ~ getGasPriceInfuraService ~ gasPrice:', gasPrice);

    const gasPriceInWei = web3.utils.toWei(gasPrice.toString(), 'gwei');
    console.log('🚀 ~ getGasPriceInfuraService ~ gasPriceInWei:', gasPriceInWei);

    Redis.getInstance()
        .getClient()
        .set('gasPrice', gasPriceInWei, {
            ex: 15, // 10 seconds
            type: 'string',
        })
        .then(() => console.log('Gas price has been saved to Redis.'))
        .catch((err: any) => console.error('Failed to save gas price to Redis.', err));

    return gasPriceInWei;
};

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
