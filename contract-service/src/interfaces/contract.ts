export interface CreateContractReq {
    owner_user_id: number;        // ID của chủ nhà
    renter_user_id: number;       // ID của người thuê
    property_id: string;          // ID tài sản
    start_date: Date;             // Ngày bắt đầu hợp đồng
    end_date: Date;               // Ngày kết thúc hợp đồng
    contract_terms: string;       // Điều khoản hợp đồng
    monthly_rent: number;         // Giá thuê hàng tháng
    deposit_amount: number;       // Số tiền đặt cọc
}
