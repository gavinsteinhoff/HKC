import { Client, DMChannel } from 'discord.js'

export const myLib = {
  async getDmChannel (userId: string, client: Client): Promise<DMChannel> {
    const user = await client.users.fetch(userId)
    let dmChannel = user.dmChannel
    if (!dmChannel) {
      dmChannel = await user.createDM()
    }
    return dmChannel
  }
}
