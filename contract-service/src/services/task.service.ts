import { ContractCancellationRequest } from '@prisma/client';
import { addDays, differenceInDays, isSameDay } from 'date-fns';
import createCronJobs from '../configs/cron.config';
import {
    getContractForRentTransaction,
    getEndContract,
    getRemindEndContracts,
    startedContract,
} from '../repositories/contract.repository';
import {
    getCancelRequestOverdue,
    getRequestsCancelContract,
} from '../repositories/contractCancellationRequest.repository';
import {
    cancelExtensionRequest,
    getOverdueExtensionRequest,
    getRemindExtensionRequest,
} from '../repositories/contractExtensionRequest.repository';
import {
    createTransaction,
    getOverdueTransactions,
    getTransactionsUnPaid,
} from '../repositories/transaction.repository';
import { dateAfter } from '../utils/dateAfter';
import { getCoinPriceService, getGasPriceInfuraService } from './coingecko.service';
import {
    cancelContractBeforeDepositService,
    endContractService,
    endContractWhenOverdueService,
    finalizeContractService,
    startRentService,
} from './contract.service';
import { updateStatusRequestService } from './contractCancellationRequest.service';
import { createNotificationQueue } from './rabbitmq.service';

class TaskService {
    private createMonthlyRentTask = () => {
        const job = createCronJobs('0 0 0 * * *', async () => {
            console.log('task.service::Monthly rent task executed');

            const contracts = await getContractForRentTransaction();
            console.log(
                contracts.map((contract) => ({
                    contractId: contract.contractId,
                    startDate: contract.startDate,
                    endDateActual: contract.endDateActual,
                })),
            );

            const queries: any[] = [];
            const currentDate = new Date().getDate();
            const currentMonth = new Date().getMonth() + 1;

            contracts.forEach((contract) => {
                const startDate = contract.startDate.getDate();

                if (startDate === currentDate) {
                    queries.push(
                        createTransaction({
                            amount: contract.monthlyRent,
                            contractId: contract.contractId,
                            status: 'PENDING',
                            title: `Thanh toán tiền thuê tháng ${currentMonth}`,
                            description: `Thanh toán tiền thuê tháng ${currentMonth} cho hợp đồng **${contract.contractId}**`,
                            fromId: contract.renterId,
                            toId: contract.ownerId,
                            endDate: dateAfter(14, true),
                            type: 'RENT',
                        }),
                    );
                }
            });

            await Promise.all([getCoinPriceService(), getGasPriceInfuraService()]);

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
        const job = createCronJobs('0 15 0 * * *', async () => {
            // Chạy vào 00:00:00 mỗi ngày
            console.log('task.service::Reject contract cancel request task executed');

            const overdueRequests = await getCancelRequestOverdue();

            const queries = overdueRequests.map((request) => {
                if (request.status === 'PENDING')
                    return updateStatusRequestService({ requestId: request.id, status: 'REJECTED' });

                return updateStatusRequestService({ requestId: request.id, status: 'CONTINUE' });
            });

            await Promise.all([getCoinPriceService(), getGasPriceInfuraService()]);
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
        const job = createCronJobs('0 10 0 * * *', async () => {
            // Chạy vào 00:00:00 mỗi ngày
            console.log('task.service::End contract by request task executed');

            const requests = await getRequestsCancelContract();

            await Promise.all([getCoinPriceService(), getGasPriceInfuraService()]);
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
        const job = createCronJobs('0 0 0 * * *', async () => {
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

            await Promise.all([getCoinPriceService(), getGasPriceInfuraService()]);
            const res = await Promise.allSettled(queries);

            console.log('handleOverdueTransactionTask::res', JSON.stringify(res));

            console.log('task.service::Overdue transaction task finished');
        });

        job.start();
    };

    private startRentalTask = () => {
        const job = createCronJobs('0 5 0 * * *', async () => {
            console.log('task.service::Start rental task executed');

            const contracts = await startedContract();

            const queries = contracts.map((contract) => startRentService(contract.contractId));

            await Promise.all([getCoinPriceService(), getGasPriceInfuraService()]);
            const res = await Promise.allSettled(queries);
            console.log('🚀 ~ job ~ res:', res);

            console.log('task.service::Start rental task finished');
        });

        job.start();
    };

    private endContractTask = () => {
        const job = createCronJobs('0 0 0 * * *', async () => {
            console.log('task.service::End contract task executed');

            const contracts = await getEndContract();
            console.log('🚀 ~ TaskService ~ endContractTask ~ contracts:', contracts);

            const queries = contracts.map(finalizeContractService);

            await Promise.all([getCoinPriceService(), getGasPriceInfuraService()]);
            const res = await Promise.allSettled(queries);
            console.log('🚀 ~ job ~ res:', res);

            console.log('task.service::End contract task finished');
        });

        job.start();
    };

    private remindPaymentTask = () => {
        const job = createCronJobs('0 20 0 * * *', async () => {
            console.log('task.service::Remind payment task executed');

            const transactions = await getTransactionsUnPaid();
            console.log('🚀 ~ TaskService ~ remindPaymentTask ~ transactions:', transactions);

            transactions.forEach((transaction) => {
                if (!transaction.fromId) return;

                if (
                    (transaction.type === 'DEPOSIT' && isSameDay(addDays(transaction.createdAt, 2), new Date())) ||
                    (transaction.type === 'RENT' &&
                        (isSameDay(addDays(transaction.createdAt, 10), new Date()) ||
                            isSameDay(addDays(transaction.createdAt, 13), new Date())))
                )
                    createNotificationQueue({
                        body:
                            transaction.type === 'DEPOSIT'
                                ? `Hạn thanh toán cọc cho hợp đồng **${transaction.contractId}** sắp đến`
                                : `Hạn thanh toán tiền thuê cho hợp đồng **${transaction.contractId}** sắp đến`,
                        title:
                            transaction.type === 'DEPOSIT'
                                ? 'Nhắc nhở thanh toán cọc'
                                : 'Nhắc nhở thanh toán tiền thuê',
                        type: 'RENTER_PAYMENT',
                        docId: transaction.contractId,
                        to: transaction.fromId,
                    })
                        .then(() => console.log('Notification sent to renter'))
                        .catch((err) => console.log('Notification error', err));
            });

            console.log('task.service::Remind payment task finished');
        });

        job.start();
    };

    private remindEndContractTask = () => {
        const job = createCronJobs('0 25 0 * * *', async () => {
            console.log('task.service::Remind end contract task executed');

            const contracts = await getRemindEndContracts();
            console.log('🚀 ~ TaskService ~ remindEndContractTask ~ contracts:', contracts);

            contracts.forEach((contract) => {
                const endDate = contract.endDateActual.toISOString().substring(0, 10).split('-').reverse().join('/');
                const dayDiff = differenceInDays(contract.endDateActual, new Date()) + 1;

                createNotificationQueue({
                    title: `Hợp đồng ${contract.contractId} sắp kết thúc`,
                    body: `Hợp đồng **${contract.contractId}** sẽ kết thúc vào ngày **${endDate}**, sau **${dayDiff}** ngày`,
                    type: 'CONTRACT_DETAIL',
                    docId: contract.contractId,
                    to: contract.renterId,
                });
            });

            console.log('task.service::Remind end contract task finished');
        });

        job.start();
    };

    private remindExtensionRequest = () => {
        const job = createCronJobs('0 30 0 * * *', async () => {
            console.log('task.service::Remind extension request task executed');

            const extensions = await getRemindExtensionRequest();
            console.log('🚀 ~ TaskService ~ remindExtensionRequest ~ extensions:', extensions);

            extensions.forEach((contract) => {
                createNotificationQueue({
                    title: `Nhắc nhở gia hạn hợp đồng`,
                    body: `Hợp đồng **${contract.contractId}** có yêu cầu gia hạn chờ duyệt`,
                    type: 'CONTRACT_DETAIL',
                    docId: contract.contractId,
                    to: contract.contract.ownerId,
                });
            });

            console.log('task.service::Remind extension request task finished');
        });

        job.start();
    };

    private handleOverdueExtensionRequest = () => {
        const job = createCronJobs('0 35 0 * * *', async () => {
            console.log('task.service::Handle overdue extension request task executed');

            const request = await getOverdueExtensionRequest();

            const ids = request.map((r) => r.id);

            await cancelExtensionRequest(ids);

            request.forEach((r) => {
                createNotificationQueue({
                    title: `Yêu cầu gia hạn hợp đồng đã bị hủy`,
                    body: `Yêu cầu gia hạn hợp đồng **${r.contractId}** đã bị hủy do quá hạn`,
                    type: 'CONTRACT_DETAIL',
                    docId: r.contractId,
                    to: r.contract.ownerId,
                });
                createNotificationQueue({
                    title: `Yêu cầu gia hạn hợp đồng đã bị hủy`,
                    body: `Yêu cầu gia hạn hợp đồng **${r.contractId}** đã bị hủy do quá hạn`,
                    type: 'CONTRACT_DETAIL',
                    docId: r.contractId,
                    to: r.contract.renterId,
                });
            });

            console.log('task.service::Handle overdue extension request task finished');
        });

        job.start();
    };

    public start = () => {
        this.createMonthlyRentTask(); // 0:0:0
        this.handleOverdueContractCancelRequestTask(); // 3
        this.handleEndContractByRequestTask(); // 2
        this.handleOverdueTransactionTask(); // 0:0:0
        this.startRentalTask(); // 1
        this.endContractTask(); // 0:0:0
        this.remindPaymentTask(); // 4
        this.remindEndContractTask(); // 5
        this.remindExtensionRequest(); // 6
        this.handleOverdueExtensionRequest(); // 7
    };
}

export default TaskService;
