import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteData() {
    try {
        // Xóa tất cả dữ liệu từ bảng transaction
        await prisma.transaction.deleteMany({});

        // Xóa tất cả dữ liệu từ bảng contract
        await prisma.contract.deleteMany({});

        console.log('All data deleted successfully');
    } catch (error) {
        console.error('Error deleting data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

deleteData();