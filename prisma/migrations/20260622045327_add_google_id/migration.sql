/*
  Warnings:

  - You are about to drop the column `provider` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[googleId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "provider",
ADD COLUMN     "googleId" TEXT;

-- DropEnum
DROP TYPE "Provider";

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
