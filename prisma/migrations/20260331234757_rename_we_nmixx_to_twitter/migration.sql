ALTER TABLE "GuildSetting"
  RENAME COLUMN "weNmixxNotificationChannelId" TO "twitterNotificationChannelId";

ALTER TABLE "GuildSetting"
  RENAME COLUMN "weNmixxNotificationRoleId" TO "twitterNotificationRoleId";

ALTER TABLE "GuildSetting"
  RENAME COLUMN "weNmixxNotificationAllowedRoleIds" TO "twitterNotificationAllowedRoleIds";
