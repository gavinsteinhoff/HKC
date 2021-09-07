import { BaseCommandInteraction, Client, Collection, CommandInteraction } from 'discord.js'
import { DateTime } from 'luxon'
import { CustomError } from '../models/CustomErrors'
import { ContextInteractionHandler, SlashInteractionHandler } from '../models/InteractionHandlers'
import fs from 'fs'
import path from 'path'

const contextInteractionsTime: Collection<string, DateTime> = new Collection()
const contextInteractions: Array<ContextInteractionHandler> = []

const slashInteractions: Array<SlashInteractionHandler> = []

const interactionEvent = {
  name: 'interactionCreate',
  async startup (client: Client) {
    const contextCommandFiles = fs.readdirSync(path.join(__dirname, '../', 'interactions', 'contextInteractions')).filter(file => file.endsWith('.js'))
    for (const file of contextCommandFiles) {
      const command = (await import((path.join(__dirname, '../', 'interactions', 'contextInteractions', file)))) as ContextInteractionHandler
      command.startup(client)
      contextInteractions.push(command)
    }

    const commandFiles = fs.readdirSync(path.join(__dirname, '../', 'interactions', 'slashInteractions')).filter(file => file.endsWith('.js'))
    for (const file of commandFiles) {
      const command = (await import((path.join(__dirname, '../', 'interactions', 'slashInteractions', file)))) as SlashInteractionHandler
      command.startup(client)
      slashInteractions.push(command)
    }
  },

  async execute (interaction: BaseCommandInteraction) {
    try {
      await interaction.deferReply({ ephemeral: true })
      const interactionName = interaction.commandName

      if (interaction.isContextMenu()) {
        const user = interaction.user.id
        const command = contextInteractions.find(c => c.name === interactionName)
        if (command) {
          if (command.time !== -1) {
            const time = contextInteractionsTime.get(`${interactionName}:${user}`)
            if (time) {
              const diff = DateTime.now().diff(time, 'seconds')
              if (diff.as('seconds') < command.time) {
                await interaction.editReply({ content: 'You are doing that too fast.' })
                return
              } else {
                contextInteractionsTime.set(`${interactionName}:${user}`, DateTime.now())
              }
            }
            contextInteractionsTime.set(`${interactionName}:${user}`, DateTime.now())
          }
          await command.execute(interaction)
        }
      }

      if (interaction.isCommand()) {
        const command = slashInteractions.find(c => c.name === interactionName)
        if (command) {
          await command.execute((interaction as CommandInteraction))
        }
      }
    } catch (err) {
      if (err instanceof CustomError) {
        await interaction.editReply({ content: err.message })
      } else {
        console.error(err)
        await interaction.editReply({ content: 'A problem occurred.' })
      }
    }
  }
}
export = interactionEvent
