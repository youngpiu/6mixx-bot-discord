// Scheduled task to delete a ticket channel after a delay
import { ApplyOptions } from '@sapphire/decorators'
import { container } from '@sapphire/pieces'
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'

interface DeleteTicketChannelPayload {
  channelId: string
}

@ApplyOptions<ScheduledTask.Options>({
  name: 'deleteTicketChannel'
})
export class DeleteTicketChannelTask extends ScheduledTask {
  public async run(payload: DeleteTicketChannelPayload) {
    const { channelId } = payload
    try {
      const channel = container.client.channels.cache.get(channelId)
      if (channel && 'delete' in channel) {
        await channel.delete()
      }
    } catch (error) {
      this.container.logger.error(
        `Failed to delete ticket channel ${channelId}:`,
        error
      )
    }
  }
}

declare module '@sapphire/plugin-scheduled-tasks' {
  interface ScheduledTasks {
    deleteTicketChannel: DeleteTicketChannelPayload
  }
}
