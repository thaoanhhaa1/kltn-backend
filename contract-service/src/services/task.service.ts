import { CronJob } from 'cron';
import { getContractsByStatus } from '../repositories/contract.repository';
import { getCancelRequestOverdue } from '../repositories/contractCancellationRequest.repository';
import { createTransaction } from '../repositories/transaction.repository';
import { dateAfter } from '../utils/dateAfter';
import { updateStatusRequestService } from './contractCancellationRequest.service';

class TaskService {
    private createMonthlyRentTask = () => {
        const job = new CronJob('0 0 0 * * *', async () => {
            const [onGoingContracts, depositedContracts] = await Promise.all([
                getContractsByStatus('ONGOING'),
                getContractsByStatus('DEPOSITED'),
            ]);
            const contracts = [...onGoingContracts, ...depositedContracts];

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

            await Promise.all(queries);

            console.log('task.service::Monthly rent task executed');
        });

        job.start();
    };

    private rejectContractCancelRequestTask = () => {
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

    public start = () => {
        this.createMonthlyRentTask();
        this.rejectContractCancelRequestTask();
    };
}

export default TaskService;
