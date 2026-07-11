-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "serviceTypeId" TEXT;

-- CreateTable
CREATE TABLE "service_types" (
    "id" TEXT NOT NULL,
    "psychologistId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slotMinutes" INTEGER NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "priceCents" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_types_psychologistId_idx" ON "service_types"("psychologistId");

-- AddForeignKey
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_psychologistId_fkey" FOREIGN KEY ("psychologistId") REFERENCES "psychologists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: backfill one default "Стандартна консультація" service per
-- psychologist from their existing global duration/break/price fields, so
-- every psychologist has a bookable default service before the old fields
-- are dropped in a later migration.
INSERT INTO "service_types" ("id", "psychologistId", "name", "slotMinutes", "breakMinutes", "priceCents", "isDefault", "active", "sortOrder", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    "id",
    'Стандартна консультація',
    "sessionDurationMinutes" + "breakDurationMinutes",
    "breakDurationMinutes",
    "defaultSessionPriceCents",
    true,
    true,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "psychologists";
