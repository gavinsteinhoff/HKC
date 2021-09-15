import Discord, { ApplicationCommandData, BaseCommandInteraction, Collection, CommandInteraction } from 'discord.js'
import fs from 'fs'
import { DateTime } from 'luxon'
import path from 'path'
import { guildId, env } from '../config.local.json'
import { CustomError } from './CustomErrors'

export interface ButtonInteractionHandler {
  name: string;
  startup(client: Discord.Client): any;
  execute(interaction: Discord.ButtonInteraction): any;
}

export interface SlashInteractionHandler {
  name: string
  time: number
  data: ApplicationCommandData[]
  startup(client: Discord.Client): any
  execute(interaction: Discord.CommandInteraction): any
}

export interface ContextInteractionHandler {
  name: string;
  type: number;
  time: number;
  startup(client: Discord.Client): any;
  execute(interaction: Discord.CommandInteraction): any;
}

const slashInteractions: Array<SlashInteractionHandler> = []
const contextInteractions: Array<ContextInteractionHandler> = []
const buttonInteractions: Array<ButtonInteractionHandler> = []

const contextInteractionsTime: Collection<string, DateTime> = new Collection()

export const InteractionHandler = {
  async GenerateInteractions (client: Discord.Client) {
    try {
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

      let data: ApplicationCommandData[] = []
      slashInteractions.forEach(element => {
        data = data.concat(element.data)
      })
      if (env === 'dev') {
        await client.application?.commands.set(data, guildId)
      }
      if (env !== 'dev') {
        await client.application?.commands.set(data)
      }

      console.log('Successfully reloaded application commands.')
    } catch (err) {
      console.error(err)
    }
  },
  async GenerateEvents (client: Discord.Client) {
    const eventFiles = fs.readdirSync(path.join(__dirname, '../', 'events')).filter(file => file.endsWith('.js'))
    for (const file of eventFiles) {
      const event = (await import((path.join(__dirname, '../', 'events', file)))) as SlashInteractionHandler
      event.startup(client)
      client.on(event.name, (...args) => (<any>event.execute)(...args))
    }
  },
  async ExecuteInteraction (interaction: BaseCommandInteraction) {
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
