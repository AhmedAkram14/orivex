/*
  Warnings:

  - Added the required column `legalBasisVersion` to the `ConsentRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ConsentRecord" ADD COLUMN     "legalBasisVersion" TEXT NOT NULL;
