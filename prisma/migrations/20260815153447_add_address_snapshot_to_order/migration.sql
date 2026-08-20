/*
  Warnings:

  - Added the required column `addressCity` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `addressDistrict` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `addressNumber` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `addressState` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `addressStreet` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `addressZipCode` to the `orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "addressCity" TEXT NOT NULL,
ADD COLUMN     "addressComplement" TEXT,
ADD COLUMN     "addressDistrict" TEXT NOT NULL,
ADD COLUMN     "addressNumber" TEXT NOT NULL,
ADD COLUMN     "addressState" TEXT NOT NULL,
ADD COLUMN     "addressStreet" TEXT NOT NULL,
ADD COLUMN     "addressZipCode" TEXT NOT NULL;
