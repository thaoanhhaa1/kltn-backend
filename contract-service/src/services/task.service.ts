import { CronJob } from 'cron';
import { getContractsByStatus } from '../repositories/contract.repository';
import { createTransaction } from '../repositories/transaction.repository';

export const createMonthlyRentTask = () => {
    const job = new CronJob('0 41 9 * * *', async () => {
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
                        description: `Thanh toán tiền thuê tháng ${contract.start_date.getMonth() + 1} cho hợp đồng **${
                            contract.contract_id
                        }**`,
                        from_id: contract.renter_user_id,
                        to_id: contract.owner_user_id,
                    }),
                );
            }
        });

        await Promise.all(queries);

        console.log('task.service::Monthly rent task executed');
    });

    job.start();
};
