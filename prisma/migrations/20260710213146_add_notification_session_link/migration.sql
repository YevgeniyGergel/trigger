-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "notifications_sessionId_type_idx" ON "notifications"("sessionId", "type");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
