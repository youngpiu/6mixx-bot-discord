-- AlterTable
ALTER TABLE "GuildSetting" ADD COLUMN     "youtubeNotificationAllowedRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
