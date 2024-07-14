import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { db } from "../../db";
import { and, eq } from "drizzle-orm";
import { socialCredits } from "../../schema";

export const execute = async (inter: ChatInputCommandInteraction) => {
  if (!inter.guild) return;

  let user = inter.options.getUser("member");

  if (
    user &&
    (!inter.memberPermissions ||
      !inter.memberPermissions.has(PermissionFlagsBits.ManageGuild))
  )
    return inter.reply({
      content: "You are not allowed to run this command.",
      ephemeral: true,
    });

  if (!user) user = inter.user;

  if (user.id === inter.client.user.id)
    return inter.reply({
      content: `Who do you think you are sir <@${inter.user.id}>, I am more powerful than you.`,
    });

  if (user.bot)
    return inter.reply({
      content: "Bots can't have social credits.",
      ephemeral: true,
    });

  await inter.deferReply();

  const existingUser = await db.query.socialCredits.findFirst({
    where: and(
      eq(socialCredits.guildId, inter.guild.id),
      eq(socialCredits.userId, user.id)
    ),
  });

  if (!existingUser)
    await db.insert(socialCredits).values({
      guildId: inter.guild.id,
      userId: user.id,
    });

  const embed = new EmbedBuilder()
    .setTitle("Social credits")
    .setDescription(
      `${user.username} has ${existingUser?.credits || 500} social credits`
    );

  await inter.editReply({
    embeds: [embed],
  });
};
