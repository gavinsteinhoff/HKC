import Discord, { ContextMenuInteraction, MessageEmbed, TextChannel } from 'discord.js'
import CustomGuild from '../../models/CustomGuild'
import { ContextInteractionHandler } from '../../models/InteractionHandlers'

const reportInteraction: ContextInteractionHandler = {
  name: 'ReportMessage',
  type: 3,
  time: 30,
  startup (localClient: Discord.Client) {
  },

  async execute (interaction: ContextMenuInteraction) {
    if (!interaction?.inGuild) return
    const channel = await interaction.client.channels.fetch(interaction.channelId)
    if (!channel) return
    if (!channel?.isText) return
    const message = await (channel as TextChannel).messages.fetch(interaction.targetId)
    const guild = await CustomGuild.Get(interaction.guildId!)

    if (guild.modLogChannel) {
      const modLogChannel = await interaction.client.channels.fetch(guild.modLogChannel);
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
