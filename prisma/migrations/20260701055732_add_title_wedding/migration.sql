/*
  Warnings:

  - Added the required column `title` to the `Wedding` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Wedding" ADD COLUMN     "title" VARCHAR(256) NOT NULL;
