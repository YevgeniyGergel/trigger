-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('GOOGLE', 'ZOOM');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MeetingProviderType" AS ENUM ('NONE', 'GOOGLE_MEET', 'ZOOM');

-- AlterTable
ALTER TABLE "psychologists" ADD COLUMN     "defaultMeetingProvider" "MeetingProviderType" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "calendarEventId" TEXT,
ADD COLUMN     "meetingExternalId" TEXT,
ADD COLUMN     "meetingProvider" "MeetingProviderType" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "meetingUrl" TEXT,
ADD COLUMN     "syncPending" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "integration_connections" (
    "id" TEXT NOT NULL,
    "psychologistId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "accessTokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "externalAccountEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_psychologistId_provider_key" ON "integration_connections"("psychologistId", "provider");

-- AddForeignKey
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_psychologistId_fkey" FOREIGN KEY ("psychologistId") REFERENCES "psychologists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
