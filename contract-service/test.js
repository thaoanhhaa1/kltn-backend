// const { PrismaClient } = require('@prisma/client');

// const prisma = new PrismaClient();

// async function resetDatabase() {
//     try {
//         // Xóa tất cả dữ liệu trong bảng `Transaction` và `Contract`
//         await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Transaction" RESTART IDENTITY CASCADE;`);
//         await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Contract" RESTART IDENTITY CASCADE;`);

//         // Xóa tất cả dữ liệu trong bảng `Property` và `Address`
//         await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Property" RESTART IDENTITY CASCADE;`);
//         await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Address" RESTART IDENTITY CASCADE;`);

//         // Xóa tất cả dữ liệu trong bảng `users` (bảng `User` ánh xạ thành `users`)
//         await prisma.$executeRawUnsafe(`TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;`);

//         console.log('All data truncated and sequences reset');
//     } catch (error) {
//         console.error('Error truncating tables:', error);
//     } finally {
//         await prisma.$disconnect();
//     }
// }

// resetDatabase();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetIdSequence() {
    try {
        // Xác minh giá trị ID tối đa hiện tại
        const result = await prisma.$executeRaw`SELECT MAX("contract_id") FROM "contract"`;
        const maxId = result[0]?.max || 0;
        console.log(`Max contract_id: ${maxId}`);

        // Đặt lại sequence để bắt đầu từ giá trị tối đa hiện tại + 1
        await prisma.$executeRawUnsafe(`
            ALTER SEQUENCE "contract_contract_id_seq" RESTART WITH ${maxId + 1}
        `);
        console.log('Sequence reset successfully.');
    } catch (error) {
        console.error('Error resetting sequence:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetIdSequence();

