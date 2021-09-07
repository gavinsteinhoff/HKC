import { SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandStringOption, SlashCommandUserOption } from '@discordjs/builders'
import Discord, { CommandInteraction, MessageEmbed, Permissions, TextChannel } from 'discord.js'
import { CustomError } from '../../models/CustomErrors'
import CustomGuild from '../../models/CustomGuild'
import { SlashInteractionHandler } from '../../models/InteractionHandlers'
import { myLib } from '../../modules/myLib'

// eslint-disable-next-line no-unused-vars
let client: Discord.Client | undefined

const builder = new SlashCommandBuilder()
  .setName('feedback')
  .setDescription('Send Feedback to the Mods')
  .addSubcommand((subCommand: SlashCommandSubcommandBuilder) =>
    subCommand
      .setName('submit')
      .setDescription('Send Feedback to the Mods')
      .addStringOption((option: SlashCommandStringOption) =>
        option
          .setName('feedback')
          .setDescription('Your Feedback.')
          .setRequired(true)
      )
  )
  .addSubcommand((subCommand: SlashCommandSubcommandBuilder) =>
    subCommand
      .setName('ban')
      .setDescription('Restricts a user who is abusing the feedback.')
      .addUserOption((option: SlashCommandUserOption) =>
        option
          .setName('channel')
          .setDescription('The channel you want mod logs sent to')
          .setRequired(true)
      )
  )

const guildInteraction: SlashInteractionHandler = {
  name: 'feedback',
  time: 30,
  data: builder.toJSON(),

  startup (localClient: Discord.Client) {
    client = localClient
  },

  async execute (interaction: CommandInteraction) {
    if (!interaction.guildId) return

    const subCommand = interaction.options.getSubcommand()

    switch (subCommand) {
      case 'submit': {
        const feedback = interaction.options.getString('feedback', true)

        const guildId = interaction.guildId

        const guild = await CustomGuild.Get(guildId)

        if (!guild.modLogChannel) throw new CustomError('Feedback Module is not setup.')

        const channel = await interaction.client.channels.fetch(guild.modLogChannel)

        if (!channel || !channel.isText) { throw new CustomError('Feedback Module is not setup.') }

        await (channel as TextChannel).send(
          {
            embeds: [
              new MessageEmbed()
                .setTitle('User Feedback')
                .setDescription(feedback)
                .addFields(
                  { name: 'User', value: myLib.getMentionUserString(interaction.user) }
                )
                .setTimestamp(interaction.createdTimestamp)
            ]
          })
        await interaction.editReply('Feedback Send!')
        break
      }
      case 'ban': {
        const permission = (await interaction.guild?.members.fetch(interaction.user.id))?.permissions.has(Permissions.FLAGS.MANAGE_GUILD, true)
        if (!permission) throw new CustomError('You do not have access to do that')

        break
      }
    }
  }
}

export = guildInteraction
