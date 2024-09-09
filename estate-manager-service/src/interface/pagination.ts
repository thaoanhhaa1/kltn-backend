export interface IPagination {
    take: number;
    skip: number;
}

export interface IPageInfo {
    current: number;
    pageSize: number;
    total: number;
}

export interface IPaginationResponse<T> {
    data: T[];
    pageInfo: IPageInfo;
}
