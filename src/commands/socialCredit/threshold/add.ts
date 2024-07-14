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
	const amount = inter.options.getInteger("amount", true);
	const type = inter.options.getString("type", true);

	if (role.managed)
		return inter.editReply({
			content:
				"You can't add this role because it's managed by an external service.",
		});

	const existingThreshold = await db.query.socialCreditsThresholds.findFirst({
		where: and(
			eq(socialCreditsThresholds.guildId, inter.guild.id),
			eq(socialCreditsThresholds.role, role.id),
		),
	});

	if (existingThreshold)
		return inter.editReply({
			content: "A threshold with this role already exists.",
		});

	// @ts-ignore: it shows an error because it thinks that type can be any
	//             string while it can only be "negative" or "positive"
	//             since those are set in the command choices
	await db.insert(socialCreditsThresholds).values({
		guildId: inter.guild.id,
		type,
		amount,
		role: role.id,
	});

	const embed = new EmbedBuilder()
		.setTitle("Social Credit Threshold")
		.setDescription(
			`You just set a ${type} social credit threshold to ${amount} social credits for <@&${role.id}>.`,
		);

	inter.editReply({
		embeds: [embed],
	});
};
