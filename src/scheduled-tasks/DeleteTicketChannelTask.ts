import { container } from '@sapphire/pieces'
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks'

interface DeleteTicketChannelPayload {
  channelId: string
}

export class DeleteTicketChannelTask extends ScheduledTask {
  public constructor(context: ScheduledTask.LoaderContext, options: ScheduledTask.Options) {
    super(context, {
      ...options,
      name: 'deleteTicketChannel'
    })
  }

  public async run(payload: DeleteTicketChannelPayload) {
    const { channelId } = payload
    try {
      const channel = container.client.channels.cache.get(channelId)
      if (channel && 'delete' in channel) {
        await channel.delete()
      }
    } catch (error) {
      this.container.logger.error(`Failed to delete ticket channel ${channelId}:`, error)
    }
  }
}

declare module '@sapphire/plugin-scheduled-tasks' {
  interface ScheduledTasks {
    deleteTicketChannel: DeleteTicketChannelPayload
  }
}
