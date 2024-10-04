import { CronJob } from 'cron';
import { getContractForRentTransaction } from '../repositories/contract.repository';
import {
    getCancelRequestOverdue,
    getRequestsCancelContract,
} from '../repositories/contractCancellationRequest.repository';
import { createTransaction } from '../repositories/transaction.repository';
import { dateAfter } from '../utils/dateAfter';
import { getCoinPriceService } from './coingecko.service';
import { endContractService } from './contract.service';
import { updateStatusRequestService } from './contractCancellationRequest.service';

class TaskService {
    private createMonthlyRentTask = () => {
        const job = new CronJob('0 0 0 * * *', async () => {
            const contracts = await getContractForRentTransaction();

            const queries: any[] = [];

            contracts.forEach((contract) => {
                const startDate = contract.start_date.getDate();
                const currentDate = new Date().getDate();

                if (startDate === currentDate) {
                    queries.push(
                        createTransaction({
                            amount: contract.monthly_rent,
                            contract_id: contract.contract_id,
                            status: 'PENDING',
                            title: `Thanh toán tiền thuê tháng ${contract.start_date.getMonth() + 1}`,
                            description: `Thanh toán tiền thuê tháng ${
                                contract.start_date.getMonth() + 1
                            } cho hợp đồng **${contract.contract_id}**`,
                            from_id: contract.renter_user_id,
                            to_id: contract.owner_user_id,
                            end_date: dateAfter(3, true),
                            type: 'RENT',
                        }),
                    );
                }
            });

            await getCoinPriceService();
            await Promise.all(queries);

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
            console.log('🚀 ~ job ~ result:', result);

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

            console.log('task.service::End contract by request task finished');
        });

        job.start();
    };

    // TODO: Overdue deposit, rent
    // TODO: End contract

    public start = () => {
        this.createMonthlyRentTask();
        this.handleOverdueContractCancelRequestTask();
        this.handleEndContractByRequestTask();
    };
}

export default TaskService;
