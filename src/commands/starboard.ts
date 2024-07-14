import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { starboardConfigs } from "../schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export const command = new SlashCommandBuilder()
  .setName("starboard")
  .setDescription("Set starboard settings")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((opt) =>
    opt
      .setName("set-channel")
      .setDescription("Set the starboard channel")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("The starboard channel")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      )
  )
  .addSubcommand((opt) =>
    opt
      .setName("set-min")
      .setDescription(
        "Set the minimum amount of stars for a post to gain in order to be posted in the starboard channel"
      )
      .addIntegerOption((opt) =>
        opt
          .setName("min-stars")
          .setDescription("The minimum amount of stars required")
          .setRequired(true)
      )
  )
  .addSubcommand((opt) =>
    opt.setName("disable").setDescription("Disable starboard")
  )
  .addSubcommand((opt) =>
    opt
      .setName("summary")
      .setDescription("The summary of the starboard config.")
  );

export async function execute(inter: ChatInputCommandInteraction) {
  if (!inter.guild) return;

  const name = inter.options.getSubcommand();

  if (name === "set-channel") {
    const channel = inter.options.getChannel("channel", true, [
      ChannelType.GuildText,
    ]);

    const me = await inter.guild.members.fetchMe();
    if (!channel.permissionsFor(me).has(PermissionFlagsBits.SendMessages)) {
      return await inter.reply(
        "I don't have permissions to send messages in that channel."
      );
    }

    const config = await db.query.starboardConfigs.findFirst({
      where: eq(starboardConfigs.guildId, inter.guildId!),
    });
    if (!config) {
      await db.insert(starboardConfigs).values({
        channelId: channel.id,
        guildId: inter.guildId!,
        minStars: 5,
      });
    } else {
      await db
        .update(starboardConfigs)
        .set({ channelId: channel.id })
        .where(eq(starboardConfigs.guildId, inter.guildId!));
    }

    return await inter.reply(`Set starboard channel to <#${channel.id}>`);
  } else if (name === "set-min") {
    const minStars = inter.options.getInteger("min-stars")!;
    const config = await db.query.starboardConfigs.findFirst({
      where: eq(starboardConfigs.guildId, inter.guildId!),
    });

    if (!config) {
      return await inter.reply(`Set a starboard channel first.`);
    }

    await db
      .update(starboardConfigs)
      .set({ minStars })
      .where(eq(starboardConfigs.guildId, inter.guildId!));
    return await inter.reply(`Set minimum stars to ${minStars}`);
  } else if (name === "disable") {
    await db
      .delete(starboardConfigs)
      .where(eq(starboardConfigs.guildId, inter.guildId!));
    return await inter.reply(`Starboard configuration deleted.`);
  } else if (name === "summary") {
    const config = await db.query.starboardConfigs.findFirst({
      where: eq(starboardConfigs.guildId, inter.guildId!),
    });

    if (!config) {
      return await inter.reply("No starboard configuration set.");
    }

    return await inter.reply(
      `Starboard channel: <#${config.channelId}>\nMinimum stars: ${config.minStars}`
    );
  }
}
