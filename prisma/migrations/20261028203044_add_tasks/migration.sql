-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "movingPlanId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "dueDate" DATE,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_movingPlanId_idx" ON "tasks"("movingPlanId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_movingPlanId_fkey" FOREIGN KEY ("movingPlanId") REFERENCES "moving_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
