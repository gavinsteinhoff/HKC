import Discord, { Collection } from 'discord.js'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import fs from 'fs'
import { ButtonInteractionHandler, ContextInteractionHandler, SlashInteractionHandler } from './models/InteractionHandlers'
import { CustomError } from './models/CustomErrors'
import path from 'path'
import { DateTime } from 'luxon'

let token = ''
if (process.env.NODE_ENV === 'prod') {
  import('./config.json').then(config => {
    token = config.token
    client.login(token)
  })
} else {
  import('./config.local.json').then(config => {
    token = config.token
    client.login(token)
  })
}

const client = new Discord.Client({
  intents: [Discord.Intents.FLAGS.GUILD_INTEGRATIONS, Discord.Intents.FLAGS.DIRECT_MESSAGES],
  allowedMentions: { parse: ['users', 'roles'], repliedUser: true }
})

const buttonInteractions: Array<ButtonInteractionHandler> = []
const slashInteractions: Array<SlashInteractionHandler> = []
const contextInteractions: Array<ContextInteractionHandler> = []

const contextInteractionsTime: Collection<string, DateTime> = new Collection()

client.once('ready', async () => {
  console.log('Ready!')

  try {
    // const commandFolders = fs.readdirSync(path.join(__dirname, 'interactions', 'buttonInteractions'))
    // for (const folder of commandFolders) {
    //   const commandFiles = fs
    //     .readdirSync(path.join(__dirname, 'interactions', 'buttonInteractions', folder))
    //     .filter(file => file.endsWith('.js'))
    //   for (const file of commandFiles) {
    //     const command = (await import((path.join(__dirname, 'interactions', 'buttonInteractions', folder, file)))) as ButtonInteractionHandler
    //     command.startup(client)
    //     buttonInteractions.push(command)
    //   }
    // }

    // const commandFiles = fs.readdirSync(path.join(__dirname, 'interactions', 'slashInteractions')).filter(file => file.endsWith('.js'))
    // for (const file of commandFiles) {
    //   const command = (await import((path.join(__dirname, 'interactions', 'slashInteractions', file)))) as SlashInteractionHandler
    //   command.startup(client)
    //   slashInteractions.push(command)
    // }

    const contextCommandFiles = fs.readdirSync(path.join(__dirname, 'interactions', 'contextInteractions')).filter(file => file.endsWith('.js'))
    for (const file of contextCommandFiles) {
      const command = (await import((path.join(__dirname, 'interactions', 'contextInteractions', file)))) as ContextInteractionHandler
      command.startup(client)
      contextInteractions.push(command)
    }

    (async () => {
      try {
        console.log('Started refreshing application context commands.')
        const rest = new REST({ version: '9' }).setToken(token)
        contextInteractions.forEach(async interaction => {
          const data = [{
            name: interaction.name,
            type: interaction.type
          }]
          await rest.put(Routes.applicationGuildCommands(client.application!.id, '712007420070854667'), { body: data })
        })

        console.log('Successfully reloaded application commands.')
      } catch (error) {
        console.error(error)
      }
    })()
  } catch (err) {
    console.error(err)
  }
})

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return
  await interaction.deferReply({ ephemeral: true })
  try {
    const interactionName = interaction.commandName
    const command = slashInteractions.find(c => c.name === interactionName)
    if (command) {
      await command.execute(interaction)
    }
  } catch (err) {
    if (err instanceof CustomError) {
      interaction.followUp({ content: err.message, ephemeral: true })
    } else {
      console.error(err)
      interaction.followUp({ content: 'A problem occurred.', ephemeral: true })
    }
  }
})

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return
  await interaction.deferUpdate()
  try {
    const interactionName = interaction.customId
    const command = buttonInteractions.find(c => c.name === interactionName)
    if (command) {
      await command.execute(interaction)
    }
  } catch (err) {
    if (err instanceof CustomError) {
      await interaction.followUp({ content: err.message, ephemeral: true })
    } else {
      console.error(err)
      await interaction.followUp({ content: 'A problem occurred.', ephemeral: true })
    }
  }
})

client.on('interactionCreate', async interaction => {
  if (!interaction.isContextMenu()) return
  await interaction.deferReply({ ephemeral: true })
  try {
    const interactionName = interaction.commandName
    const user = interaction.user.id
    const command = contextInteractions.find(c => c.name === interactionName)
    if (command) {
      if (command.time !== -1) {
        const time = contextInteractionsTime.get(`${interactionName}:${user}`)
        if (time) {
          const diff = DateTime.now().diff(time, 'second')
          if (diff.as('second') < command.time) {
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
  } catch (err) {
    if (err instanceof CustomError) {
      await interaction.editReply({ content: err.message })
    } else {
      console.error(err)
      await interaction.editReply({ content: 'A problem occurred.' })
    }
  }
})
