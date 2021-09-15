import { BaseCommandInteraction, Client, Collection, CommandInteraction } from 'discord.js'
import { DateTime } from 'luxon'
import { CustomError } from '../models/CustomErrors'
import { ButtonInteractionHandler, ContextInteractionHandler, SlashInteractionHandler } from '../models/InteractionHandlers'
import fs from 'fs'
import path from 'path'

const contextInteractionsTime: Collection<string, DateTime> = new Collection()

const contextInteractions: Array<ContextInteractionHandler> = []
const slashInteractions: Array<SlashInteractionHandler> = []
const buttonInteractions: Array<ButtonInteractionHandler> = []

const interactionEvent = {
  name: 'interactionCreate',
  async startup (client: Client) {
    for (const file of getSlashInteractionFiles()) {
      const command = (await import(file)) as SlashInteractionHandler
      slashInteractions.push(command)
    }

    for (const file of getContextInteractionFiles()) {
      const command = (await import(file)) as ContextInteractionHandler
      contextInteractions.push(command)
    }

    for (const file of getButtonInteractionFiles()) {
      const command = (await import(file)) as ButtonInteractionHandler
      buttonInteractions.push(command)
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

function getAllFiles (dirPath: string, arrayOfFiles?: string[]) {
  const files = fs.readdirSync(dirPath)
  if (arrayOfFiles === undefined) arrayOfFiles = []

  files.forEach(function (file) {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles)
    } else {
      arrayOfFiles!.push(path.join(dirPath, '/', file))
    }
  })
  return arrayOfFiles
}

function getSlashInteractionFiles () {
  return getAllFiles(path.join(__dirname, '../', 'modules')).filter(f => f.endsWith('.slashInteraction.js'))
}

function getContextInteractionFiles () {
  return getAllFiles(path.join(__dirname, '../', 'modules')).filter(f => f.endsWith('.contextInteraction.js'))
}

function getButtonInteractionFiles () {
  return getAllFiles(path.join(__dirname, '../', 'modules')).filter(f => f.endsWith('.buttonInteraction.js'))
}
