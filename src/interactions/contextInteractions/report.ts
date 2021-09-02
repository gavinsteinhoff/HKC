import Discord, { ContextMenuInteraction, MessageEmbed, TextChannel } from 'discord.js'
import CustomGuild from '../../models/CustomGuild'
import { ContextInteractionHandler } from '../../models/InteractionHandlers'

let client: Discord.Client | undefined

const reportInteraction: ContextInteractionHandler = {
  name: 'ReportMessage',
  type: 3,
  time: 30,
  startup (localClient: Discord.Client) {
    client = localClient
  },

  async execute (interaction: ContextMenuInteraction) {
    if (!interaction?.inGuild) return
    const channel = await client!.channels.fetch(interaction.channelId)
    if (!channel) return
    if (!channel?.isText) return
    const message = await (channel as TextChannel).messages.fetch(interaction.targetId)
    // const guild = await CustomGuild.Get(interaction.guildId!)
    const guild = new CustomGuild('712007420070854667')
    guild.modLogChannel = '882805625636159510'

    if (guild.modLogChannel) {
      const modLogChannel = await client!.channels.fetch(guild.modLogChannel);
      (modLogChannel as TextChannel).send({
        embeds: [
          new MessageEmbed()
            .setTitle('User Reported Message')
            .setDescription(message.content)
            .addFields(
              { name: 'User', value: `<@${message.author.id}>` },
              { name: 'Reported By', value: `<@${interaction.user.id}>` },
              { name: 'Message Link', value: `[Message](https://discord.com/channels/${guild.id}/${channel.id}/${message.id})` }
            )
            .setTimestamp(message.createdTimestamp)
        ],
        allowedMentions: { parse: ['users'] }
      })
    }

    interaction.editReply('Thanks for the report!')
  }
}

export = reportInteraction;
