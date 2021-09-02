import Discord from 'discord.js'

export interface ButtonInteractionHandler {
  name: string;
  startup(client: Discord.Client): any;
  execute(interaction: Discord.ButtonInteraction): any;
}

export interface SlashInteractionHandler {
  name: string;
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
