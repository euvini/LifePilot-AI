-- AlterTable
ALTER TABLE "moving_plans" ADD COLUMN "userId" UUID;

-- CreateIndex
CREATE INDEX "moving_plans_userId_idx" ON "moving_plans"("userId");
