-- CreateEnum
CREATE TYPE "Status" AS ENUM ('WAITING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Contract" (
    "contract_id" SERIAL NOT NULL,
    "owner_address" TEXT NOT NULL,
    "renter_address" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'WAITING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "monthly_rent" DOUBLE PRECISION NOT NULL,
    "deposit_amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("contract_id")

);
