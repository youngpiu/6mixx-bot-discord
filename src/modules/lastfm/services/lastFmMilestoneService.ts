import { container } from '@sapphire/pieces'

export class LastFmMilestoneService {
  private static readonly MILESTONES = [
    1000, 5000, 10000, 25000, 50000, 75000, 100000, 150000, 200000, 250000,
    300000, 350000, 400000, 450000, 500000, 600000, 700000, 800000, 900000,
    1000000
  ]

  /**
   * Checks for milestones and returns the reached milestone if any.
   */
  public static checkMilestone(
    previousCount: number,
    currentCount: number
  ): number | null {
    for (const milestone of this.MILESTONES.slice().reverse()) {
      if (currentCount >= milestone && previousCount < milestone) {
        return milestone
      }
    }
    return null
  }

  /**
   * Placeholder for sending milestone notifications.
   * In a real bot, you might want to send this to a specific log channel or back to the interaction.
   */
  public static async notifyMilestone(
    userId: string,
    milestone: number,
    guildId?: string
  ) {
    if (!guildId) return

    // Find a channel to notify (could be configured in guild settings)
    // For now, we'll just log it or you could implementation actual Discord notification here.
    container.logger.info(
      `User ${userId} reached ${milestone} scrobbles in guild ${guildId}`
    )
  }
}
