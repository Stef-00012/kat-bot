import {
	type ChatInputCommandInteraction,
	EmbedBuilder,
	PermissionFlagsBits,
} from "discord.js";
import { db } from "../../../db";
import { and, eq } from "drizzle-orm";
import { socialCreditsThresholds } from "../../../schema";

export const execute = async (inter: ChatInputCommandInteraction) => {
	if (!inter.guild) return;

	if (
		!inter.memberPermissions ||
		!inter.memberPermissions.has(PermissionFlagsBits.ManageGuild)
	)
		return inter.reply({
			content: "You are not allowed to run this command.",
			ephemeral: true,
		});

	await inter.deferReply();

	const thresholds = await db
		.select()
		.from(socialCreditsThresholds)
		.where(eq(socialCreditsThresholds.guildId, inter.guild.id));

    if (thresholds.length <= 0) return inter.editReply({
        content: "This server has no thresholds."
    })

    const thresholdsString = thresholds.map(threhsold => `**Type**: ${threhsold.type}\n**Amount**: ${threhsold.amount}\n**Role**: <@&${threhsold.role}>`)

	const embed = new EmbedBuilder()
		.setTitle("Social Credit Thresholds")
		.setDescription(thresholdsString.join('\n\n'))

	inter.editReply({
		embeds: [embed],
	});
};
