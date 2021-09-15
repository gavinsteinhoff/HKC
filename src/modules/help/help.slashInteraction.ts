import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from '@discordjs/builders'
import Discord, { CommandInteraction, MessageEmbed, Permissions } from 'discord.js'
import { CustomError } from '../../models/CustomErrors'
import { SlashInteractionHandler } from '../../models/InteractionHandlers'

const builder = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Provides Help')

builder
  .addSubcommand((command: SlashCommandSubcommandBuilder) =>
    command
      .setName('ping')
      .setDescription('Provides Ping.')
  )
  .addSubcommand((command: SlashCommandSubcommandBuilder) =>
    command
      .setName('info')
      .setDescription('Sends bot info to you.')
  )
  .addSubcommand((command: SlashCommandSubcommandBuilder) =>
    command
      .setName('post')
      .setDescription('Post bot info to the chat.')
  )

const helpInteraction: SlashInteractionHandler = {
  name: 'help',
  time: -1,
  data: [
    {
      name: 'help',
      description: 'Provides Help',
      options: [
        {
          name: 'ping',
          description: 'Provides ping',
          type: 'SUB_COMMAND'
        },
        {
          name: 'info',
          description: 'Sends bot info to you.',
          type: 'SUB_COMMAND'
        },
        {
          name: 'post',
          description: 'Post bot info to the chat.',
          type: 'SUB_COMMAND'
        }
      ]
    }
  ],
  startup (localClient: Discord.Client) {
  },

  async execute (interaction: CommandInteraction) {
    if (!interaction.guildId) return

    const subCommand = interaction.options.getSubcommand(true)

    switch (subCommand) {
      case 'ping': {
        interaction.editReply(`🏓Latency is ${Date.now() - interaction.createdTimestamp}ms. API Latency is ${Math.round(interaction.client.ws.ping)}ms`)
        break
      }
      case 'info': {
        interaction.editReply(helpMessage)
        break
      }
      case 'post': {
        const permission = (await interaction.guild?.members.fetch(interaction.user.id))?.permissions.has(Permissions.FLAGS.MANAGE_GUILD, true)
        if (!permission) throw new CustomError('You do not have access to do that')
        interaction.channel?.send(helpMessage)
        interaction.editReply('Sent Info!')
        break
      }
    }
  }
}

export = helpInteraction

const helpMessage = {
  content: 'Thanks for inviting me, HKC! I am a bot that mostly does moderation.',
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
}
