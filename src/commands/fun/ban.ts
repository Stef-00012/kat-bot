import { Client, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export const command = new SlashCommandBuilder()
  .setName("fun")
  .setDescription("Funny haha commands")
  .addSubcommand(subcommand =>
    subcommand
      .setName('ban')
      .setDescription('Bans a user (not really tho)')
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption(option => option.setName('user').setDescription('The user to (fake)ban'))
      .addStringOption(option =>
        option.setName('reason')
          .setDescription('The reason for the (fake)ban')
          .setMaxLength(2000)
      )
  );

export async function execute(inter: ChatInputCommandInteraction, client: Client) {
  const user = inter.options.getUser('user');
  const reason = inter.options.getString('reason') ?? 'No reason provided';

  const fakeBanEmbed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('The ban hammer has spoken')
    .setAuthor({ name: inter.member.user.username, iconURL: inter.member.user.displayAvatarURL({ format: "png" }) })
    .setDescription('The ban hammer has spoken and has taken action')
    .addFields(
      { name: 'Member', value: user?.username ?? 'Unknown User' },
      { name: 'Reason', value: reason },
    )
    .setTimestamp()
    .setFooter({ text: 'KatBot', iconURL: client.user?.displayAvatarURL({ format: "png" }) ?? '' });

  await inter.reply({ embeds: [fakeBanEmbed] });
}
