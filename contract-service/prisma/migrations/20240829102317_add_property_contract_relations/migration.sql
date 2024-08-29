/*
  Warnings:

  - The values [ACCEPTED,REJECTED,CANCELLED] on the enum `Status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `owner_address` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `renter_address` on the `Contract` table. All the data in the column will be lost.
  - Added the required column `owner_user_id` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `renter_user_id` to the `Contract` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED', 'UNAVAILABLE');

-- AlterEnum
BEGIN;
CREATE TYPE "Status_new" AS ENUM ('WAITING', 'DEPOSITED', 'ONGOING', 'ENDED');
ALTER TABLE "Contract" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Contract" ALTER COLUMN "status" TYPE "Status_new" USING ("status"::text::"Status_new");
ALTER TYPE "Status" RENAME TO "Status_old";
ALTER TYPE "Status_new" RENAME TO "Status";
DROP TYPE "Status_old";
ALTER TABLE "Contract" ALTER COLUMN "status" SET DEFAULT 'WAITING';
COMMIT;

-- AlterTable
ALTER TABLE "Contract" DROP COLUMN "owner_address",
DROP COLUMN "renter_address",
ADD COLUMN     "owner_user_id" INTEGER NOT NULL,
ADD COLUMN     "renter_user_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "users" (
    "user_id" INTEGER NOT NULL,
    "wallet_address" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Address" (
    "address_id" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "ward" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("address_id")
);

-- CreateTable
CREATE TABLE "Property" (
    "_id" TEXT NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'PENDING',
    "deleted" BOOLEAN DEFAULT false,
    "address_id" TEXT NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_address_key" ON "users"("wallet_address");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "Address"("address_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_renter_user_id_fkey" FOREIGN KEY ("renter_user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;
