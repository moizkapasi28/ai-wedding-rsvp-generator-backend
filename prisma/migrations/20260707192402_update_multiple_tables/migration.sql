/*
  Warnings:

  - A unique constraint covering the columns `[wedding_id,id]` on the table `Guest` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `wedding_id` to the `Guest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "wedding_id" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Guest_wedding_id_id_key" ON "Guest"("wedding_id", "id");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
