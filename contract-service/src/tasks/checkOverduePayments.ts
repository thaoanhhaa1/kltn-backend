import prisma from '../prisma/prismaClient';
import { addMonths, isAfter, addDays } from 'date-fns';

export const checkOverduePayments = async () => {
    try {
        const contracts = await prisma.contract.findMany({
            where: {
                status: 'ONGOING',
            },
        });

        const currentTime = new Date();
        console.log(`Current time: ${currentTime}`);

        for (const contract of contracts) {
            const lastPayment = await prisma.transaction.findFirst({
                where: {
                    contract_id: contract.contract_id,
                    description: 'Monthly rent payment',
                },
                orderBy: {
                    created_at: 'desc',
                },
            });

            if (!lastPayment) {
                // Nếu không có giao dịch thanh toán nào, kiểm tra từ ngày bắt đầu hợp đồng
                const nextPaymentDate = new Date(contract.start_date);
                const paymentWindowEnd = addDays(nextPaymentDate, 20);

                console.log(`Contract ${contract.contract_id} - No payment found.`);
                console.log(`Next payment date: ${nextPaymentDate}`);
                console.log(`Payment window end: ${paymentWindowEnd}`);

                if (isAfter(currentTime, paymentWindowEnd)) {
                    // Cập nhật trạng thái hợp đồng thành 'OVERDUE'
                    await prisma.contract.update({
                        where: { contract_id: contract.contract_id },
                        data: {
                            status: 'OVERDUE',
                            updated_at: new Date(),
                        },
                    });

                    console.log(`Contract ${contract.contract_id} is overdue.`);
                }
            } else {
                // Nếu có giao dịch thanh toán, tính toán ngày thanh toán tiếp theo
                let nextPaymentDate = new Date(lastPayment.created_at);
                nextPaymentDate = addMonths(nextPaymentDate, 1);
                const paymentWindowEnd = addDays(nextPaymentDate, 20);

                console.log(`Contract ${contract.contract_id} - Last payment date: ${lastPayment.created_at}`);
                console.log(`Next payment date: ${nextPaymentDate}`);
                console.log(`Payment window end: ${paymentWindowEnd}`);



                if (isAfter(currentTime, paymentWindowEnd)) {
                    // Cập nhật trạng thái hợp đồng thành 'OVERDUE'
                    await prisma.contract.update({
                        where: { contract_id: contract.contract_id },
                        data: {
                            status: 'OVERDUE',
                            updated_at: new Date(),
                        },
                    });

                    console.log(`Contract ${contract.contract_id} is overdue.`);
                }
            }
        }
    } catch (error) {
        console.error('Error checking overdue payments:', error);
    }
};