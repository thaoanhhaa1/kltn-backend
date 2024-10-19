import { ContractCancellationRequest } from '@prisma/client';
import { CronJob } from 'cron';
import { getContractForRentTransaction } from '../repositories/contract.repository';
import {
    getCancelRequestOverdue,
    getRequestsCancelContract,
} from '../repositories/contractCancellationRequest.repository';
import { createTransaction, getOverdueTransactions } from '../repositories/transaction.repository';
import { dateAfter } from '../utils/dateAfter';
import { getCoinPriceService } from './coingecko.service';
import {
    cancelContractBeforeDepositService,
    endContractService,
    endContractWhenOverdueService,
} from './contract.service';
import { updateStatusRequestService } from './contractCancellationRequest.service';
import { createNotificationQueue } from './rabbitmq.service';

class TaskService {
    private createMonthlyRentTask = () => {
        const job = new CronJob('0 0 0 * * *', async () => {
            const contracts = await getContractForRentTransaction();
            console.log('🚀 ~ TaskService ~ job ~ contracts:', contracts);

            const queries: any[] = [];
            const currentDate = new Date().getDate();

            contracts.forEach((contract) => {
                const startDate = contract.startDate.getDate();

                if (startDate === currentDate) {
                    queries.push(
                        createTransaction({
                            amount: contract.monthlyRent,
                            contractId: contract.contractId,
                            status: 'PENDING',
                            title: `Thanh toán tiền thuê tháng ${contract.startDate.getMonth() + 1}`,
                            description: `Thanh toán tiền thuê tháng ${
                                contract.startDate.getMonth() + 1
                            } cho hợp đồng **${contract.contractId}**`,
                            fromId: contract.renterId,
                            toId: contract.ownerId,
                            endDate: dateAfter(14, true),
                            type: 'RENT',
                        }),
                    );
                }
            });

            await getCoinPriceService();
            const res = await Promise.allSettled(queries);
            console.log('🚀 ~ TaskService ~ job ~ res:', res);

            res.forEach((item, index) => {
                if (item.status === 'rejected') return;

                const contract = contracts[index];

                createNotificationQueue({
                    body: `Thanh toán tiền thuê tháng ${contract.startDate.getMonth() + 1} cho hợp đồng **${
                        contract.contractId
                    }**`,
                    title: `Thanh toán tiền thuê tháng ${contract.startDate.getMonth() + 1}`,
                    type: 'RENTER_PAYMENT',
                    docId: contract.contractId,
                    to: contract.renterId,
                })
                    .then(() => console.log('Notification sent to renter'))
                    .catch((err) => console.log('Notification error', err));
            });

            console.log('task.service::Monthly rent task executed');
        });

        job.start();
    };

    private handleOverdueContractCancelRequestTask = () => {
        const job = new CronJob('0 0 0 * * *', async () => {
            // Chạy vào 00:00:00 mỗi ngày
            console.log('task.service::Reject contract cancel request task executed');

            const overdueRequests = await getCancelRequestOverdue();

            const queries = overdueRequests.map((request) => {
                if (request.status === 'PENDING')
                    return updateStatusRequestService({ requestId: request.id, status: 'REJECTED' });

                return updateStatusRequestService({ requestId: request.id, status: 'CONTINUE' });
            });

            const result = await Promise.allSettled(queries);

            result.forEach((res) => {
                if (res.status === 'rejected') return;

                const isRejected = res.value.request.status === 'REJECTED';

                const request = res.value.request as ContractCancellationRequest;

                if (isRejected)
                    createNotificationQueue({
                        body: `Yêu cầu hủy hợp đồng của bạn đã bị từ chối`,
                        title: `Yêu cầu hủy hợp đồng đã bị từ chối`,
                        type: 'RENTER_CONTRACT',
                        docId: request.contractId,
                        to: request.requestedBy,
                    });
            });

            console.log('task.service::Reject contract cancel request task finished');
        });

        job.start();
    };

    private handleEndContractByRequestTask = () => {
        const job = new CronJob('0 0 0 * * *', async () => {
            // Chạy vào 00:00:00 mỗi ngày
            console.log('task.service::End contract by request task executed');

            const requests = await getRequestsCancelContract();
            await getCoinPriceService();

            const result = await Promise.allSettled(requests.map(endContractService));
            console.log('🚀 ~ job ~ requests:', requests);
            console.log('🚀 ~ job ~ result:', result);

            result.forEach((res: any) => {
                if (res.status === 'rejected') return;

                createNotificationQueue({
                    body: `Hợp đồng **${res.value.contractId}** đã được hủy`,
                    title: `Hợp đồng đã được hủy`,
                    type: 'RENTER_CONTRACT',
                    docId: res.value.contractId,
                    to: res.value.fromId,
                });
                createNotificationQueue({
                    body: `Hợp đồng **${res.value.contractId}** đã được hủy`,
                    title: `Hợp đồng đã được hủy`,
                    type: 'OWNER_CONTRACT',
                    docId: res.value.contractId,
                    to: res.value.toId,
                });
            });

            console.log('task.service::End contract by request task finished');
        });

        job.start();
    };

    private handleOverdueTransactionTask = () => {
        // const job = new CronJob('0 5 0 * * *', async () => {
        const job = new CronJob('0 14 20 * * *', async () => {
            // run at 00:10:16
            console.log('task.service::Overdue transaction task executed');

            const transactions = await getOverdueTransactions();
            console.log('🚀 ~ job ~ transactions:', transactions);

            const queries = transactions.map((transaction) => {
                if (transaction.type === 'DEPOSIT')
                    return cancelContractBeforeDepositService({
                        userId: transaction.fromId!,
                        contractId: transaction.contractId,
                        isOverdue: true,
                    });

                return endContractWhenOverdueService(transaction.contractId);
            });

            const res = await Promise.allSettled(queries);

            console.log('handleOverdueTransactionTask::res', JSON.stringify(res));

            console.log('task.service::Overdue transaction task finished');
        });

        job.start();
    };

    // TODO: Overdue deposit, rent
    // TODO: End contract

    public start = () => {
        this.createMonthlyRentTask();
        this.handleOverdueContractCancelRequestTask();
        this.handleEndContractByRequestTask();
        this.handleOverdueTransactionTask();
    };
}

export default TaskService;
