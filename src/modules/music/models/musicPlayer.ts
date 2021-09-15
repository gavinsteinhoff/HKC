import { joinVoiceChannel, entersState, VoiceConnectionStatus, AudioPlayerStatus, AudioResource } from '@discordjs/voice'
import { Snowflake } from 'discord-api-types'
import { CommandInteraction, GuildMember, Interaction, MessageEmbed } from 'discord.js'
import { myLib } from '../../myLib'
import { MusicSubscription } from './subscription'
import { Track } from './track'

enum MusicPlayerMessageType {
  Play,
  Skip,
  Queue,
  QueueList,
  Pause,
  Resume,
  Leave,
  Error
}

interface SendMessageOptions {
  messageType: MusicPlayerMessageType,
  interaction: Interaction,
  track?: Track
  tracks?: Track[]
}

export default class MusicPlayer {
    // Maps guild IDs to music subscriptions, which exist if the bot has an active VoiceConnection to the guild.
    static subscriptions = new Map<Snowflake, MusicSubscription>()
    guildId: Snowflake
    private _subscription: MusicSubscription | undefined
    public get subscription (): MusicSubscription | undefined {
      return MusicPlayer.subscriptions.get(this.guildId)
    }

    public set subscription (value: MusicSubscription | undefined) {
      if (!value) return
      MusicPlayer.subscriptions.set(this.guildId, value)
    }

    private RemoveSubscription () {
      MusicPlayer.subscriptions.delete(this.guildId)
    }

    constructor (guildId: Snowflake) {
      this.guildId = guildId
    }

    public async Play (interaction: CommandInteraction): Promise<void> {
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
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const musicPlayer = this
        // Attempt to create a Track from the user's video URL
        const track = await Track.from(url, interaction.user.id, {
          onStart () {
            musicPlayer.SendMessage({ messageType: MusicPlayerMessageType.Play, interaction: interaction, track: track })
          },
          onFinish () {
            // interaction.editReply({ content: 'Now finished!' }).catch(console.warn)
          },
          onError (error) {
            console.warn(error)
            musicPlayer.SendMessage({ messageType: MusicPlayerMessageType.Skip, interaction: interaction })
            // interaction.editReply({ content: `Error: ${error.message}` }).catch(console.warn)
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

    public async Skip (interaction: CommandInteraction): Promise<void> {
      if (this.subscription) {
        // Calling .stop() on an AudioPlayer causes it to transition into the Idle state. Because of a state transition
        // listener defined in music/subscription.ts, transitions into the Idle state mean the next track from the queue
        // will be loaded and played.
        this.subscription.audioPlayer.stop()
        await interaction.editReply('Skipped song!')
        this.SendMessage({ messageType: MusicPlayerMessageType.Skip, interaction: interaction })
      } else {
        await interaction.editReply('Not playing in this server!')
      }
    }

    public async Queue (interaction: CommandInteraction): Promise<void> {
      // Print out the current queue, including up to the next 5 tracks to be played.
      if (this.subscription) {
        const tracks = this.subscription.queue
        let track: Track | undefined
        if (this.subscription.audioPlayer.state.status !== AudioPlayerStatus.Idle) {
          track = (this.subscription.audioPlayer.state.resource as AudioResource<Track>).metadata
        }
        await interaction.editReply('Getting Queue')
        this.SendMessage({ messageType: MusicPlayerMessageType.QueueList, interaction: interaction, track: track, tracks: tracks })
      } else {
        await interaction.editReply('Not playing in this server!')
      }
    }

    public async Pause (interaction: CommandInteraction): Promise<void> {
      if (this.subscription) {
        this.subscription.audioPlayer.pause()
        this.SendMessage({ messageType: MusicPlayerMessageType.Pause, interaction: interaction })
        await interaction.editReply({ content: 'Paused!' })
      } else {
        await interaction.editReply('Not playing in this server!')
      }
    }

    public async Resume (interaction: CommandInteraction): Promise<void> {
      if (this.subscription) {
        this.subscription.audioPlayer.unpause()
        this.SendMessage({ messageType: MusicPlayerMessageType.Resume, interaction: interaction })
        await interaction.editReply({ content: 'Unpaused!' })
      } else {
        await interaction.editReply('Not playing in this server!')
      }
    }

    public async Leave (interaction: CommandInteraction): Promise<void> {
      if (this.subscription) {
        this.subscription.voiceConnection.destroy()
        this.RemoveSubscription()
        await interaction.editReply({ content: 'Leaving!' })
        this.SendMessage({ messageType: MusicPlayerMessageType.Leave, interaction: interaction })
      } else {
        await interaction.editReply('Not playing in this server!')
      }
    }

    public async SendMessage (args: SendMessageOptions): Promise<void> {
      const embeds:MessageEmbed[] = []
      switch (args.messageType) {
        case MusicPlayerMessageType.Play: {
          if (!args.track) break
          embeds.push(new MessageEmbed()
            .setTitle('Now Playing!')
            .setDescription(args.track.title)
            .setURL(args.track.url)
            .setTimestamp(Date.now())
            .addField('Requested by', myLib.getMentionUserString(args.interaction.user))
          )
          break
        }
        case MusicPlayerMessageType.Skip: {
          break
        }
        case MusicPlayerMessageType.Queue: {
          if (!args.track) break
          embeds.push(new MessageEmbed()
            .setTitle('Added to Queue!')
            .setDescription(args.track.title)
            .setURL(args.track.url)
            .setTimestamp(Date.now())
            .addField('Requested by', myLib.getMentionUserString(args.interaction.user))
          )
          break
        }
        case MusicPlayerMessageType.QueueList: {
          const desc = args.track ? `Now Playing: ${args.track.title}` : 'Nothing Playing'
          const embed = (new MessageEmbed()
            .setTitle('Queue List!')
            .setDescription(desc)
            .setTimestamp(Date.now())
            .addField('Requested by', myLib.getMentionUserString(args.interaction.user))
          )
          if (args.tracks) {
            for (const [i, track] of args.tracks.entries()) {
              const user = await args.interaction.client.users.fetch(track.user)
              embed.addField(`Track ${i + 1}`, `${myLib.getMentionUserString(user)} \n [${track.title}](${track.url})`)
            }
          }
          embeds.push(embed)
          break
        }
        case MusicPlayerMessageType.Pause: {
          embeds.push(new MessageEmbed()
            .setTitle('Music Paused!')
            .setTimestamp(Date.now())
            .addField('Requested by', myLib.getMentionUserString(args.interaction.user))
          )
          break
        }
        case MusicPlayerMessageType.Resume: {
          embeds.push(new MessageEmbed()
            .setTitle('Music Resumed!')
            .setTimestamp(Date.now())
            .addField('Requested by', myLib.getMentionUserString(args.interaction.user))
          )
          break
        }
        case MusicPlayerMessageType.Leave: {
          embeds.push(new MessageEmbed()
            .setTitle('Music Stopped!')
            .setTimestamp(Date.now())
            .addField('Requested by', myLib.getMentionUserString(args.interaction.user))
          )
          break
        }
        case MusicPlayerMessageType.Error: {
          embeds.push(new MessageEmbed()
            .setTitle('Error Occurred.')
            .setTimestamp(Date.now())
          )
          break
        }
      }

      await args.interaction.channel?.send({ embeds: embeds })
    }
}
