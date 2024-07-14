import {
	type ChatInputCommandInteraction,
	EmbedBuilder,
	PermissionFlagsBits,
} from "discord.js";
import { db } from "../../../db";
import { eq } from "drizzle-orm";
import { socialCredits } from "../../../schema";

export const execute = async (inter: ChatInputCommandInteraction) => {
	if (!inter.guild) return;

	await inter.deferReply();

	const users = await db.select()
        .from(socialCredits)
        .where(eq(socialCredits.guildId, inter.guild.id))

	const top = users
        .sort((a, b) => a.credits - b.credits)
        .slice(0, 9)
        .map(user => `<@${user.userId}> - ${user.credits}`)

    let leaderboard = ''

    for (const position in top) {
        leaderboard += `${position}. ${top[position]}\n`
    }

	const embed = new EmbedBuilder()
		.setTitle("Top Social Credit Leaderboard")
		.setDescription(leaderboard);

	inter.editReply({
		embeds: [embed],
	});
};
