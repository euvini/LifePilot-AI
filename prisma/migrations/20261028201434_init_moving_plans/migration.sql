-- CreateTable
CREATE TABLE "moving_plans" (
    "id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "origin" VARCHAR(200) NOT NULL,
    "destination" VARCHAR(200) NOT NULL,
    "movingDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moving_plans_pkey" PRIMARY KEY ("id")
);
