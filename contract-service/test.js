const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetDatabase() {
    try {
        // Xóa tất cả dữ liệu trong bảng `Transaction` và `Contract`
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Transaction" RESTART IDENTITY CASCADE;`);
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Contract" RESTART IDENTITY CASCADE;`);

        // Xóa tất cả dữ liệu trong bảng `Property` và `Address`
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Property" RESTART IDENTITY CASCADE;`);
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Address" RESTART IDENTITY CASCADE;`);

        // Xóa tất cả dữ liệu trong bảng `users` (bảng `User` ánh xạ thành `users`)
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;`);

        console.log('All data truncated and sequences reset');
    } catch (error) {
        console.error('Error truncating tables:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetDatabase();
