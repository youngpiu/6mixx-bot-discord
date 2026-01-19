-- CreateIndex
CREATE INDEX "Ticket_guildId_type_idx" ON "Ticket"("guildId", "type");

-- CreateIndex
CREATE INDEX "Ticket_guildId_code_idx" ON "Ticket"("guildId", "code");

-- CreateIndex
CREATE INDEX "Ticket_guildId_createdAt_idx" ON "Ticket"("guildId", "createdAt" DESC);
