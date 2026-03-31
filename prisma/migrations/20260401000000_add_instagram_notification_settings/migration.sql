ALTER TABLE "GuildSetting"
  ADD COLUMN "instagramNotificationChannelId" TEXT,
  ADD COLUMN "instagramNotificationRoleId" TEXT,
  ADD COLUMN "instagramNotificationAllowedRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
