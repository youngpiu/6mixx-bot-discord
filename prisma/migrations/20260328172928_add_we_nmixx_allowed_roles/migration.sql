-- AlterTable
ALTER TABLE "GuildSetting" ADD COLUMN     "weNmixxNotificationAllowedRoleIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
