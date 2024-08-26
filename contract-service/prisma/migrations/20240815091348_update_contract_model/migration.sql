/*
  Warnings:

  - Added the required column `contract_terms` to the `Contract` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "contract_terms" TEXT NOT NULL;
