import {
    AttachmentBuilder,
	type ChatInputCommandInteraction,
	EmbedBuilder,
	PermissionFlagsBits,
} from "discord.js";
import { db } from "../../db";
import { and, eq } from "drizzle-orm";
import { socialCredits, socialCreditsThresholds } from "../../schema";
import { generateSocialCreditImage } from '../../utils/socialCredit.ts';

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

	if (!inter.guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles))
		return inter.reply({
			content: "I do not have the permission to manage roles.",
			ephemeral: true,
		});

	const user = inter.options.getUser("member");
	const amount = inter.options.getInteger("amount", true);
	const reason = inter.options.getString("reason");

	if (!user)
		return inter.reply({
			content: "I could not find this user.",
            ephemeral: true
		});

	if (user.bot)
		return inter.reply({
			content: "Bots can't have social credits.",
		});

	if (user.id === inter.client.user.id)
		return inter.reply({
			content: `Who do you think you are sir <@${inter.user.id}>, I am more powerful than you.`,
            ephemeral: true
		});

    await inter.deferReply();

	let existingUser = await db.query.socialCredits.findFirst({
		where: and(
			eq(socialCredits.guildId, inter.guild.id),
			eq(socialCredits.userId, user.id),
		),
	});

	const thresholds = await db
		.select()
		.from(socialCreditsThresholds)
		.where(eq(socialCreditsThresholds.guildId, inter.guild.id));

	if (!existingUser) {
		existingUser = {
			guildId: inter.guild.id,
			userId: user.id,
			credits: 500 + amount,
		};

		await db.insert(socialCredits).values({
			...existingUser,
		});
	} else {
		existingUser.credits += amount;

		await db
			.update(socialCredits)
			.set({
				...existingUser,
			})
			.where(
				and(
					eq(socialCredits.guildId, inter.guild.id),
					eq(socialCredits.userId, user.id),
				),
			);
	}

	const addedRoles = [];
	const removedRoles = [];

	for (const threshold of thresholds) {
		if (
			threshold.type === "negative" &&
			existingUser.credits > threshold.amount
		) {
			try {
				const thresholdRole = await inter.guild.roles.fetch(threshold.role);

				if (!thresholdRole) return;

				if (thresholdRole.managed) continue;

				const member = await inter.guild.members.fetch(user.id);

				if (member.roles.cache.has(thresholdRole.id)) {
					member.roles.remove(thresholdRole);

					removedRoles.push(thresholdRole.id);
				}
			} catch (e) {}
		} else if (
			threshold.type === "negative" &&
			existingUser.credits < threshold.amount
		) {
			try {
				const thresholdRole = await inter.guild.roles.fetch(threshold.role);

				if (!thresholdRole) return;

				if (thresholdRole.managed) continue;

				const member = await inter.guild.members.fetch(user.id);

				if (!member.roles.cache.has(thresholdRole.id)) {
					member.roles.add(thresholdRole);

					addedRoles.push(thresholdRole.id);
				}
			} catch (e) {}
		} else if (
			threshold.type === "positive" &&
			existingUser.credits > threshold.amount
		) {
			try {
				const thresholdRole = await inter.guild.roles.fetch(threshold.role);

				if (!thresholdRole) return;

				if (thresholdRole.managed) continue;

				const member = await inter.guild.members.fetch(user.id);

				if (!member.roles.cache.has(thresholdRole.id)) {
					member.roles.add(thresholdRole);

					addedRoles.push(thresholdRole.id);
				}
			} catch (e) {}
		} else if (
			threshold.type === "positive" &&
			existingUser.credits < threshold.amount
		) {
			try {
				const thresholdRole = await inter.guild.roles.fetch(threshold.role);

				if (!thresholdRole) return;

				if (thresholdRole.managed) continue;

				const member = await inter.guild.members.fetch(user.id);

				if (member.roles.cache.has(thresholdRole.id)) {
					member.roles.remove(thresholdRole);

					removedRoles.push(thresholdRole.id);
				}
			} catch (e) {}
		}
	}

	const embed = new EmbedBuilder()
		.setTitle("Social credits")
		.setDescription(
			`<@${user.id}> has gained ${amount} social credits. Now they have ${existingUser.credits} social credits.${
				reason ? `\nReason: ${reason}` : ""
			}${
				addedRoles.length > 0
					? `\nAdded Roles: ${addedRoles.map((addedRole) => `<@&${addedRole}>`).join(", ")}`
					: ""
			}${
				removedRoles.length > 0
					? `\nRemoved Roles: ${removedRoles.map((removedRole) => `<@&${removedRole}>`).join(", ")}`
					: ""
			}`,
		)
        .setImage('attachment://social_credit.png');

    const socialCreditImage = await generateSocialCreditImage(amount, "positive")
    
    const attachment = new AttachmentBuilder(socialCreditImage, {
        name: "social_credit.png"
    })

	await inter.editReply({
		embeds: [embed],
        files: [attachment]
	});
};
