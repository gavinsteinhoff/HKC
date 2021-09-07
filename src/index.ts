import Discord from 'discord.js'
import { token } from './config.local.json'
import { InteractionHandler } from './models/InteractionHandlers'

const client = new Discord.Client({
  intents: [
    Discord.Intents.FLAGS.GUILD_INTEGRATIONS,
    Discord.Intents.FLAGS.DIRECT_MESSAGES,
    Discord.Intents.FLAGS.GUILDS
  ],
  allowedMentions: { parse: ['users', 'roles'], repliedUser: true }
})

client.once('ready', async () => {
  console.log('Ready!')
  InteractionHandler.GenerateInteractions(client)
  InteractionHandler.GenerateEvents(client)
})

client.login(token)
// https://discord.com/oauth2/authorize?client_id=883209997587202049&permissions=120727923830&scope=bot%20applications.commands
// https://discord.com/oauth2/authorize?client_id=883209997587202049&permissions=8&scope=bot%20applications.commands
