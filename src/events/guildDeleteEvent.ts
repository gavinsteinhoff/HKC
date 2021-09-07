import { Client, Guild } from 'discord.js'
import CustomGuild from '../models/CustomGuild'

const interactionEvent = {
  name: 'guildDelete',
  async startup (client: Client) {

  },

  async execute (deletedGuild: Guild) {
    try {
      const guild = await CustomGuild.Get(deletedGuild.id)
      guild.Delete()
    } catch (err) {
      console.error(err)
    }
  }
}
export = interactionEvent
