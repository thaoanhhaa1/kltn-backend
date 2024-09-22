import { IPageInfo, IPagination } from '../interfaces/pagination';

const getPageInfo = (
    params: IPagination & {
        count: number;
    },
): IPageInfo => {
    const current = Math.ceil(params.skip / params.take) + 1;

    return {
        current,
        pageSize: params.take,
        total: params.count,
    };
};

export default getPageInfo;
