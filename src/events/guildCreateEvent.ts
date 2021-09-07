import { Client, Guild, MessageEmbed, TextChannel } from 'discord.js'
import CustomGuild from '../models/CustomGuild'

const interactionEvent = {
  name: 'guildCreate',
  async startup (client: Client) {

  },

  async execute (newGuild: Guild) {
    try {
      const guild = new CustomGuild(newGuild.id)
      await guild.Save()
      const channels = await newGuild.channels.fetch()
      const channel = channels.find(c => c.name === 'general')
      if (channel && channel.isText) {
        (channel as TextChannel).send({
          content: 'Thanks for inviting me, HKC! I am bot that mostly does moderation.',
          embeds: [
            new MessageEmbed()
              .setTitle('Admin Setup')
              .setFields([
                {
                  name: '/guild update',
                  value: 'Edits various properties of your guild.'
                }
              ]),
            new MessageEmbed()
              .setTitle('User Commands')
              .setFields([
                {
                  name: '/feedback submit',
                  value: 'Submit Feedback to the mods'
                },
                {
                  name: 'Right Click Message, Report',
                  value: 'Report a message to the mods'
                }
              ])
          ]
        })
      }
    } catch (err) {
      console.error(err)
    }
  }
}
export = interactionEvent
