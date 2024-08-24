// export interface IUpdateContractReq {
//     contractId: number;
//     userId: number;
// }

export interface CreateContractReq {
    owner_address: string;
    renter_address: string;
    property_id: string;
    contract_terms: string;
    start_date: Date;
    end_date: Date;
    rentalIndex: number;
    depositAmount: string; // Giữ dạng chuỗi để tránh mất mát dữ liệu
    monthlyRent: string; // Giữ dạng chuỗi để tránh mất mát dữ liệu
    
}



