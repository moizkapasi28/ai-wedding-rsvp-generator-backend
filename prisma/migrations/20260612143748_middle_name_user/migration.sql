/*
  Warnings:

  - Added the required column `middle_name` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "middle_name" VARCHAR(256) NOT NULL;
