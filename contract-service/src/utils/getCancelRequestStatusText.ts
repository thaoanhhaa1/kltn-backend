import { ContractCancellationRequestStatus } from '@prisma/client';

const getCancelRequestStatusText = (status: ContractCancellationRequestStatus) => {
    if (status === 'PENDING') return 'Chờ xác nhận';
    if (status === 'APPROVED') return 'Đã chấp nhận';
    if (status === 'REJECTED') return 'Đã từ chối';
    if (status === 'CANCELLED') return 'Đã hủy';
    if (status === 'CONTINUE') return 'Tiếp tục thuê';
    if (status === 'UNILATERAL_CANCELLATION') return 'Huỷ một phía';
    return 'Không xác định';
};

export default getCancelRequestStatusText;
