import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export const command = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Help command");

export async function execute(inter: ChatInputCommandInteraction) {
  await inter.reply(
    `Hi, I'm SigmaBot. Developed by <@1154458236632698921>, using Bun and Discord.js ❤️\nContribute to my code on the [github page](<https://github.com/Linker-123/kat-bot>)`
  );
}
