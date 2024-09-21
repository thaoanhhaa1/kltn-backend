import web3 from '../configs/web3.config';
import { getCoinPriceService } from '../services/coingecko.service';

const convertVNDToWei = async (vnd: number) => {
    const ethVnd = await getCoinPriceService({
        coin: 'ethereum',
        currency: 'vnd',
    });
    console.log('ETH/VND:', ethVnd);

    return web3.utils.toWei((vnd / ethVnd).toString(), 'ether');
};

export default convertVNDToWei;
