import { SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandStringOption, SlashCommandSubcommandGroupBuilder, SlashCommandChannelOption } from '@discordjs/builders'
import Discord, { CommandInteraction, Permissions } from 'discord.js'
import { CustomError } from '../../models/CustomErrors'
import CustomGuild from '../../models/CustomGuild'
import { SlashInteractionHandler } from '../../models/InteractionHandlers'

// eslint-disable-next-line no-unused-vars
let client: Discord.Client | undefined

const builder = new SlashCommandBuilder()
  .setName('guild')
  .setDescription('Manage your Guild')

builder.addSubcommand((command: SlashCommandSubcommandBuilder) =>
  command
    .setName('add')
    .setDescription('Adds your guild to our services.')
    .addStringOption((option: SlashCommandStringOption) =>
      option.setName('timezone').setDescription('Your local timezone, like "America/New_York"').setRequired(true)
    )
)

builder.addSubcommandGroup((command: SlashCommandSubcommandGroupBuilder) =>
  command
    .setName('update')
    .setDescription('Updates your guild with our services.')
    .addSubcommand((subCommand: SlashCommandSubcommandBuilder) =>
      subCommand
        .setName('timezone')
        .setDescription('Updates the timezone your guild uses.')
        .addStringOption((option: SlashCommandStringOption) =>
          option.setName('timezone').setDescription('Your local timezone, like "America/New_York"').setRequired(true)
        )
    )
    .addSubcommand((subCommand: SlashCommandSubcommandBuilder) =>
      subCommand
        .setName('logchannel')
        .setDescription('Updates the mod log channel your guild uses.')
        .addChannelOption((option: SlashCommandChannelOption) =>
          option.setName('channel').setDescription('The channel you want mod logs sent to').setRequired(true)
        )
    )
)

const guildInteraction: SlashInteractionHandler = {
  name: 'guild',
  time: -1,
  data: builder.toJSON(),

  startup (localClient: Discord.Client) {
    client = localClient
  },

  async execute (interaction: CommandInteraction) {
    if (!interaction.guildId) return

    const permission = (await interaction.guild?.members.fetch(interaction.user.id))?.permissions.has(Permissions.FLAGS.MANAGE_GUILD, true)
    if (!permission) throw new CustomError('You do not have access to do that')

    const subCommand = interaction.options.getSubcommand(false)
    const subCommandGroup = interaction.options.getSubcommandGroup(false)

    switch (subCommandGroup) {
      case 'update': {
        switch (subCommand) {
          case 'timezone': {
            const timezone = interaction.options.getString('timezone', true)
            const guild = await CustomGuild.Get(interaction.guildId)
            guild.timezone = timezone
            await guild.Update()
            interaction.editReply('Updated Guild!')
            break
          }
          case 'logchannel': {
            const channel = interaction.options.getChannel('channel', true)
            const guild = await CustomGuild.Get(interaction.guildId)
            guild.modLogChannel = channel.id
            await guild.Update()
            interaction.editReply(`Updated mod log channel to ${channel.name}!`)
            break
          }
        }
        break
      }
      case undefined: {
        switch (subCommand) {
          case 'add': {
            const guild = new CustomGuild(interaction.guildId)
            const timezone = interaction.options.getString('timezone', true)
            guild.timezone = timezone
            await guild.Save()
            interaction.editReply('Linked Guild!')
            break
          }
        }
        break
      }
    }
  }
}

export = guildInteraction
