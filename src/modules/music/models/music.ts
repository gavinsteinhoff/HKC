import { joinVoiceChannel, entersState, VoiceConnectionStatus, AudioPlayerStatus, AudioResource } from '@discordjs/voice'
import { Snowflake } from 'discord-api-types'
import { CommandInteraction, GuildMember } from 'discord.js'
import { MusicSubscription } from './subscription'
import { Track } from './track'

export default class MusicPlayer {
    // Maps guild IDs to music subscriptions, which exist if the bot has an active VoiceConnection to the guild.
    static subscriptions = new Map<Snowflake, MusicSubscription>()
    guildId: string
    private _subscription: MusicSubscription | undefined
    public get subscription (): MusicSubscription | undefined {
      return MusicPlayer.subscriptions.get(this.guildId)
    }

    public set subscription (value: MusicSubscription | undefined) {
      MusicPlayer.subscriptions.set(this.guildId, value!)
    }

    constructor (guildId: string) {
      this.guildId = guildId
    }

    private GetSubscription () {
      return MusicPlayer.subscriptions.get(this.guildId)
    }

    private SetSubscription () {
      return MusicPlayer.subscriptions.get(this.guildId)
    }

    public async Play (interaction: CommandInteraction) {
      // Extract the video URL from the command
      const url = interaction.options.getString('song', true)

      // If a connection to the guild doesn't already exist and the user is in a voice channel, join that channel
      // and create a subscription.
      if (!this.subscription) {
        if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
          const channel = interaction.member.voice.channel
          const subscription = new MusicSubscription(
            joinVoiceChannel({
              channelId: channel.id,
              guildId: channel.guild.id,
              adapterCreator: channel.guild.voiceAdapterCreator
            })
          )
          subscription.voiceConnection.on('error', console.warn)
          this.subscription = (subscription)
        }
      }

      // If there is no subscription, tell the user they need to join a channel.
      if (!this.subscription) {
        await interaction.editReply('Join a voice channel and then try that again!')
        return
      }

      // Make sure the connection is ready before processing the user's request
      try {
        await entersState(this.subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3)
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
        this.subscription.enqueue(track)
        await interaction.editReply(`Enqueued **${track.title}**`)
      } catch (error) {
        console.warn(error)
        await interaction.editReply('Failed to play track, please try again later!')
      }
    }

    private SendPlayMessage (interaction: CommandInteraction) {
        
    }

    public async Skip (interaction: CommandInteraction) {
      if (this.subscription) {
        // Calling .stop() on an AudioPlayer causes it to transition into the Idle state. Because of a state transition
        // listener defined in music/subscription.ts, transitions into the Idle state mean the next track from the queue
        // will be loaded and played.
        this.subscription.audioPlayer.stop()
        await interaction.editReply('Skipped song!')
      } else {
        await interaction.editReply('Not playing in this server!')
      }
    }

    public async Queue (interaction: CommandInteraction) {
      // Print out the current queue, including up to the next 5 tracks to be played.
      if (this.subscription) {
        const current =
                this.subscription.audioPlayer.state.status === AudioPlayerStatus.Idle
                  ? 'Nothing is currently playing!'
                  : `Playing **${(this.subscription.audioPlayer.state.resource as AudioResource<Track>).metadata.title}**`

        const queue = this.subscription.queue
          .slice(0, 5)
          .map((track: Track, index: number) => `${index + 1}) ${track.title}`)
          .join('\n')

        await interaction.editReply(`${current}\n\n${queue}`)
      } else {
        await interaction.editReply('Not playing in this server!')
      }
    }

    public async Pause (interaction: CommandInteraction) {
      if (this.subscription) {
        this.subscription.audioPlayer.pause()
        await interaction.editReply({ content: 'Paused!' })
      } else {
        await interaction.editReply('Not playing in this server!')
      }
    }

    public async Resume (interaction: CommandInteraction) {
      if (this.subscription) {
        this.subscription.audioPlayer.unpause()
        await interaction.editReply({ content: 'Unpaused!' })
      } else {
        await interaction.editReply('Not playing in this server!')
      }
    }

    public async Leave (interaction: CommandInteraction) {
      if (this.subscription) {
        this.subscription.voiceConnection.destroy()
        this.subscription = undefined
        await interaction.editReply({ content: 'Left channel!' })
      } else {
        await interaction.editReply('Not playing in this server!')
      }
    }
}
