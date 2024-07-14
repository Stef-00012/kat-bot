import { type ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import fs from "node:fs";
import path from "node:path";

export const command = new SlashCommandBuilder()
	.setName("credit")
	.setDescription("Social credit related commands")
	.addSubcommand((subcommand) =>
		subcommand
			.setName("add")
			.setDescription("Adds social credit to a user")
			.addUserOption((option) =>
				option
					.setName("member")
					.setDescription("The user to add the social credit to")
					.setRequired(true),
			)
			.addIntegerOption((option) =>
				option
					.setName("amount")
					.setDescription("The amount of social credits to add")
					.setRequired(true),
			)
			.addStringOption((option) =>
				option
					.setName("reason")
					.setDescription("The reason for the social credit change")
					.setRequired(false),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName("remove")
			.setDescription("Removes social credit to a user")
			.addUserOption((option) =>
				option
					.setName("member")
					.setDescription("The user to add the social credit to")
					.setRequired(true),
			)
			.addIntegerOption((option) =>
				option
					.setName("amount")
					.setDescription("The amount of social credits to remove")
					.setRequired(true),
			)
			.addStringOption((option) =>
				option
					.setName("reason")
					.setDescription("The reason for the social credit change")
					.setRequired(false),
			),
	)
	.addSubcommand((subcommand) =>
		subcommand
			.setName("view")
			.setDescription("View your social credit")
			.addUserOption((option) =>
				option
					.setName("member")
					.setDescription(
						"The user you want to see the credit of (moderator only)",
					)
					.setRequired(false),
			),
	)
	.addSubcommandGroup((subcommandGroup) =>
		subcommandGroup
			.setName("threshold")
			.setDescription("Manage the thresholds for social credit related roles")
			.addSubcommand((subcommand) =>
				subcommand
					.setName("add")
					.setDescription("Add a treshold")
					.addStringOption((option) =>
						option
							.setName("type")
							.setDescription("the type of treshold")
							.setChoices([
								{
									name: "Positive",
									value: "positive",
								},
								{
									name: "Negative",
									value: "negative",
								},
							])
							.setRequired(true),
					)
					.addIntegerOption((option) =>
						option
							.setName("amount")
							.setDescription("Amount at which the threshold is triggered")
							.setRequired(true),
					)
					.addRoleOption((option) =>
						option
							.setName("role")
							.setDescription("the role threshold to add")
							.setRequired(true),
					),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName("remove")
					.setDescription("Remove a treshold")
					.addRoleOption((option) =>
						option
							.setName("role")
							.setDescription("The role threshold to remove")
							.setRequired(true),
					),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName("view")
					.setDescription("View a treshold data")
					.addRoleOption((option) =>
						option
							.setName("role")
							.setDescription("The role to view the threshold of")
							.setRequired(true),
					),
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName("list")
					.setDescription("List all thresholds"),
			),
	);

export async function execute(inter: ChatInputCommandInteraction) {
	const selectedSubcommandGroup = inter.options.getSubcommandGroup();
	const selectedSubcommand = inter.options.getSubcommand();

	let filePath: string;

	if (selectedSubcommandGroup)
		filePath = path.join(
			__dirname,
			selectedSubcommandGroup,
			`${selectedSubcommand}.ts`,
		);
	else filePath = path.join(__dirname, `${selectedSubcommand}.ts`);

	if (!fs.existsSync(filePath)) return;

	const { execute } = await import(filePath);

	if (!execute) return;

	await execute(inter);
}
