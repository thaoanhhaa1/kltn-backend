const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetDatabase() {
    try {
        // Xóa tất cả dữ liệu trong bảng Contract và Transaction
        await prisma.$executeRaw`TRUNCATE TABLE "Contract" RESTART IDENTITY CASCADE;`;
        await prisma.$executeRaw`TRUNCATE TABLE "Transaction" RESTART IDENTITY CASCADE;`;

        console.log('All data truncated and sequences reset');
    } catch (error) {
        console.error('Error truncating tables:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetDatabase();
