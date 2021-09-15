import { AudioPlayerStatus, AudioResource, entersState, joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice'
import Discord, { CommandInteraction, GuildMember, Snowflake } from 'discord.js'
import { SlashInteractionHandler } from '../../models/InteractionHandlers'
import { MusicSubscription } from './models/subscription'
import { Track } from './models/track'

/**
 * Maps guild IDs to music subscriptions, which exist if the bot has an active VoiceConnection to the guild.
 */
const subscriptions = new Map<Snowflake, MusicSubscription>()

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
  },

  async execute (interaction: CommandInteraction) {
    if (!interaction.guildId) return
    let subscription = subscriptions.get(interaction.guildId)
    const command = interaction.options.getSubcommand(true)
    switch (command) {
      case 'play': {
        // Extract the video URL from the command
        const url = interaction.options.getString('song', true)

        // If a connection to the guild doesn't already exist and the user is in a voice channel, join that channel
        // and create a subscription.
        if (!subscription) {
          if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
            const channel = interaction.member.voice.channel
            subscription = new MusicSubscription(
              joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator
              })
            )
            subscription.voiceConnection.on('error', console.warn)
            subscriptions.set(interaction.guildId, subscription)
          }
        }

        // If there is no subscription, tell the user they need to join a channel.
        if (!subscription) {
          await interaction.editReply('Join a voice channel and then try that again!')
          return
        }

        // Make sure the connection is ready before processing the user's request
        try {
          await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3)
        } catch (error) {
          console.warn(error)
          await interaction.editReply('Failed to join voice channel within 20 seconds, please try again later!')
          return
        }

        try {
          // Attempt to create a Track from the user's video URL
          const track = await Track.from(url, {
            onStart () {
              interaction.editReply({ content: 'Now playing!' }).catch(console.warn)
            },
            onFinish () {
              interaction.editReply({ content: 'Now finished!' }).catch(console.warn)
            },
            onError (error) {
              console.warn(error)
              interaction.editReply({ content: `Error: ${error.message}` }).catch(console.warn)
            }
          })
          // Enqueue the track and editReply a success message to the user
          subscription.enqueue(track)
          await interaction.editReply(`Enqueued **${track.title}**`)
        } catch (error) {
          console.warn(error)
          await interaction.editReply('Failed to play track, please try again later!')
        }
        break
      }
      case 'skip': {
        if (subscription) {
          // Calling .stop() on an AudioPlayer causes it to transition into the Idle state. Because of a state transition
          // listener defined in music/subscription.ts, transitions into the Idle state mean the next track from the queue
          // will be loaded and played.
          subscription.audioPlayer.stop()
          await interaction.editReply('Skipped song!')
        } else {
          await interaction.editReply('Not playing in this server!')
        }
        break
      }
      case 'queue': {
        // Print out the current queue, including up to the next 5 tracks to be played.
        if (subscription) {
          const current =
                subscription.audioPlayer.state.status === AudioPlayerStatus.Idle
                  ? 'Nothing is currently playing!'
                  : `Playing **${(subscription.audioPlayer.state.resource as AudioResource<Track>).metadata.title}**`

          const queue = subscription.queue
            .slice(0, 5)
            .map((track: Track, index: number) => `${index + 1}) ${track.title}`)
            .join('\n')

          await interaction.editReply(`${current}\n\n${queue}`)
        } else {
          await interaction.editReply('Not playing in this server!')
        }
        break
      }
      case 'pause': {
        if (subscription) {
          subscription.audioPlayer.pause()
          await interaction.editReply({ content: 'Paused!' })
        } else {
          await interaction.editReply('Not playing in this server!')
        }
        break
      }
      case 'resume': {
        if (subscription) {
          subscription.audioPlayer.unpause()
          await interaction.editReply({ content: 'Unpaused!' })
        } else {
          await interaction.editReply('Not playing in this server!')
        }
        break
      }
      case 'leave': {
        if (subscription) {
          subscription.voiceConnection.destroy()
          subscriptions.delete(interaction.guildId)
          await interaction.editReply({ content: 'Left channel!' })
        } else {
          await interaction.editReply('Not playing in this server!')
        }
        break
      }
      default:
        await interaction.editReply('Unknown command')
        break
    }
  }
}

export = musicInteraction
