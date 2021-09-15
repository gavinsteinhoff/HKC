import Discord, { CommandInteraction } from 'discord.js'
import { SlashInteractionHandler } from '../../models/InteractionHandlers'
import MusicPlayer from './models/musicPlayer'

const musicInteraction: SlashInteractionHandler = {
  name: 'music',
  time: -1,
  data: [
    {
      name: 'music',
      description: 'Some Music',
      options: [
        {
          name: 'play',
          description: 'Plays a song',
          type: 'SUB_COMMAND',
          options: [
            {
              name: 'song',
              type: 'STRING',
              description: 'The URL of the song to play',
              required: true
            }
          ]
        },
        {
          name: 'skip',
          description: 'Skip to the next song in the queue',
          type: 'SUB_COMMAND'
        },
        {
          name: 'queue',
          description: 'See the music queue',
          type: 'SUB_COMMAND'
        },
        {
          name: 'pause',
          description: 'Pauses the song that is currently playing',
          type: 'SUB_COMMAND'
        },
        {
          name: 'resume',
          description: 'Resume playback of the current song',
          type: 'SUB_COMMAND'
        },
        {
          name: 'leave',
          description: 'Leave the voice channel',
          type: 'SUB_COMMAND'
        }
      ]
    }
  ],

  startup (localClient: Discord.Client) {
    //
  },

  async execute (interaction: CommandInteraction) {
    if (!interaction.guildId) return
    const command = interaction.options.getSubcommand(true)
    const musicPlayer = new MusicPlayer(interaction.guildId)
    switch (command) {
      case 'play': {
        musicPlayer.Play(interaction)
        break
      }
      case 'skip': {
        musicPlayer.Skip(interaction)
        break
      }
      case 'queue': {
        musicPlayer.Queue(interaction)
        break
      }
      case 'pause': {
        musicPlayer.Pause(interaction)
        break
      }
      case 'resume': {
        musicPlayer.Resume(interaction)
        break
      }
      case 'leave': {
        musicPlayer.Leave(interaction)
        break
      }
      default:
        await interaction.editReply('Unknown command')
        break
    }
  }
}

export = musicInteraction
