import { REST } from '@discordjs/rest'
import { RESTPostAPIApplicationCommandsJSONBody, Routes } from 'discord-api-types/v9'
import Discord from 'discord.js'
import fs from 'fs'
import path from 'path'
import { token, guildId, env } from '../config.local.json'

export interface ButtonInteractionHandler {
  name: string;
  startup(client: Discord.Client): any;
  execute(interaction: Discord.ButtonInteraction): any;
}

export interface SlashInteractionHandler {
  name: string;
  time: number;
  data: RESTPostAPIApplicationCommandsJSONBody ;
  startup(client: Discord.Client): any;
  execute(interaction: Discord.CommandInteraction): any;
}

export interface ContextInteractionHandler {
  name: string;
  type: number;
  time: number;
  startup(client: Discord.Client): any;
  execute(interaction: Discord.CommandInteraction): any;
}

// const buttonInteractions: Array<ButtonInteractionHandler> = []
const slashInteractions: Array<SlashInteractionHandler> = []
const contextInteractions: Array<ContextInteractionHandler> = []

export const InteractionHandler = {
  async GenerateInteractions (client: Discord.Client) {
    try {
      const commandFiles = fs.readdirSync(path.join(__dirname, '../', 'interactions', 'slashInteractions')).filter(file => file.endsWith('.js'))
      for (const file of commandFiles) {
        const command = (await import((path.join(__dirname, '../', 'interactions', 'slashInteractions', file)))) as SlashInteractionHandler
        slashInteractions.push(command)
      }

      const contextCommandFiles = fs.readdirSync(path.join(__dirname, '../', 'interactions', 'contextInteractions')).filter(file => file.endsWith('.js'))
      for (const file of contextCommandFiles) {
        const command = (await import((path.join(__dirname, '../', 'interactions', 'contextInteractions', file)))) as ContextInteractionHandler
        contextInteractions.push(command)
      }

      console.log('Started refreshing application commands.')
      const rest = new REST({ version: '9' }).setToken(token)
      const data: object[] = []
      contextInteractions.forEach(async interaction => {
        data.push({
          name: interaction.name,
          type: interaction.type
        })
      })
      slashInteractions.forEach(async interaction => {
        data.push(interaction.data)
      })

      await rest.put(Routes.applicationGuildCommands(client.application!.id, guildId), { body: data })
      if (env !== 'dev') { await rest.put(Routes.applicationCommands(client.application!.id), { body: [data] }) }

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
  }
}
