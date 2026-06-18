-- CreateEnum
CREATE TYPE "InflationMeasure" AS ENUM ('CPI', 'PCE');

-- CreateTable
CREATE TABLE "observations" (
    "id" SERIAL NOT NULL,
    "inflationMeasure" "InflationMeasure" NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "fredDate" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metadata" (
    "id" SERIAL NOT NULL,
    "inflationMeasure" "InflationMeasure" NOT NULL,
    "lastObservationDate" TEXT NOT NULL,
    "totalObservations" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "inflationMeasure" "InflationMeasure" NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "telemetry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "observations_inflationMeasure_year_month_key" ON "observations"("inflationMeasure", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "metadata_inflationMeasure_key" ON "metadata"("inflationMeasure");

-- CreateIndex
CREATE INDEX "telemetry_timestamp_inflationMeasure_idx" ON "telemetry"("timestamp", "inflationMeasure");
