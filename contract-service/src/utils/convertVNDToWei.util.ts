import Redis from '../configs/redis.config';
import web3 from '../configs/web3.config';
import { getCoinPriceService } from '../services/coingecko.service';

const convertVNDToWei = async (vnd: number) => {
    const res = await Redis.getInstance().getClient().get(`coin-eth-vnd`);
    let ethVnd = 0;

    if (res) ethVnd = parseFloat(res);
    else {
        ethVnd = await getCoinPriceService({
            coin: 'ethereum',
            currency: 'vnd',
        });

        Redis.getInstance()
            .getClient()
            .set(`coin-eth-vnd`, ethVnd, {
                ex: 60, // 1 phút
                type: 'double',
            })
            .then(() => {
                console.log('Set redis cache');
            })
            .catch((err: any) => {
                console.error('Error setting redis cache:', err);
            });
    }

    return web3.utils.toWei((vnd / ethVnd).toString(), 'ether');
};

export default convertVNDToWei;
