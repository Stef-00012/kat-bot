import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export const command = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("delay between you and bot (ws)");

export async function execute(inter: ChatInputCommandInteraction) {
  const ping = inter.client.ws.ping;

  if (ping <= 0) {
    await inter.reply("could not determine delay");
    return;
  }

  await inter.reply(`Pong! ${ping}ms`);
}
