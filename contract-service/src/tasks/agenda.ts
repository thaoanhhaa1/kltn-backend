import { Agenda, Job } from 'agenda';
import { endContract } from '../repositories/contract.repository';
import envConfig from '../configs/env.config';
import { checkOverduePayments } from './checkOverduePayments'; // Đảm bảo rằng bạn đã tạo file này
import prisma from '../prisma/prismaClient';
const mongoConnectionString = envConfig.MONGO_CONNECTION;

const agenda = new Agenda({ db: { address: mongoConnectionString, collection: 'agendaJobs' } });

agenda.define('end contracts', async (job, done) => {
    console.log('Running job: end contracts');

    // Lấy danh sách các hợp đồng cần kiểm tra
    const contracts = await prisma.contract.findMany({
        where: {
            status: {
                in: ['ONGOING', 'WAITING'], // Các trạng thái hợp đồng cần kiểm tra
            },
        },
    });

    for (const contract of contracts) {
        try {
            await endContract(contract.contract_id, contract.owner_user_id);
        } catch (error) {
            console.error(`Error ending contract ${contract.contract_id}:`, error);
        }
    }

    done();
});

agenda.define('check overdue payments', async (job, done) => {
    console.log('Running job: check overdue payments');

    try {
        await checkOverduePayments();
    } catch (error) {
        console.error('Error in checkOverduePayments:', error);
    }

    done();
});

export const startAgenda = async () => {
    await agenda.start();

    // Lên lịch công việc kiểm tra quá hạn thanh toán mỗi ngày vào lúc 00:00
    await agenda.every('0 0 * * *', 'check overdue payments');
    console.log('Scheduled job: check overdue payments');

    // Lên lịch công việc kết thúc hợp đồng mỗi ngày vào lúc 01:00
    await agenda.every('0 1 * * *', 'end contracts');
    console.log('Scheduled job: end contracts');

    // Thực thi công việc ngay khi ứng dụng khởi động
    await agenda.now('check overdue payments', {});
    console.log('Executed job: check overdue payments');

    await agenda.now('end contracts', {});
    console.log('Executed job: end contracts');
};