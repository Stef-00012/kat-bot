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

	const role = inter.options.getRole("role", true);

	const existingThreshold = await db.query.socialCreditsThresholds.findFirst({
		where: and(
			eq(socialCreditsThresholds.guildId, inter.guild.id),
			eq(socialCreditsThresholds.role, role.id),
		),
	});

	if (!existingThreshold)
		return inter.editReply({
			content: "There is no threshold with this role.",
		});

	const embed = new EmbedBuilder()
		.setTitle("Social Credit Threshold")
		.addFields([
			{
				name: "Role",
				value: existingThreshold.role,
			},
			{
				name: "amount",
				value: `${existingThreshold.amount}`,
			},
			{
				name: "type",
				value: existingThreshold.type,
			},
		]);

	inter.editReply({
		embeds: [embed],
	});
};
