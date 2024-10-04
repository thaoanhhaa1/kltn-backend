import { ContractCancellationRequestStatus, Status } from '@prisma/client';

const getContractStatusByCancelStatus = ({
    status,
    isRented,
}: {
    status: ContractCancellationRequestStatus;
    isRented?: boolean;
}): Status => {
    switch (status) {
        case 'APPROVED':
            return 'APPROVED_CANCELLATION';
        case 'PENDING':
            return 'PENDING_CANCELLATION';
        case 'UNILATERAL_CANCELLATION':
            return 'UNILATERAL_CANCELLATION';
        case 'REJECTED':
            return 'REJECTED_CANCELLATION';
        default:
            return isRented ? 'ONGOING' : 'DEPOSITED';
    }
};

export default getContractStatusByCancelStatus;
