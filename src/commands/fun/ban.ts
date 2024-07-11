import {
  Client,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  PermissionFlagsBits,
  GuildMember,
  User,
} from "discord.js";

export const command = new SlashCommandBuilder()
  .setName("fun")
  .setDescription("Funny haha commands")
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("ban")
      .setDescription("Bans a user (not really tho)")
      .addUserOption((option) =>
        option.setName("user").setDescription("The user to (fake)ban")
      )
      .addStringOption((option) =>
        option
          .setName("reason")
          .setDescription("The reason for the (fake)ban")
          .setMaxLength(2000)
      )
  );

export async function execute(
  inter: ChatInputCommandInteraction,
  client: Client
) {
  if (!inter.member) return;

  const user = inter.options.getUser("user");
  const reason = inter.options.getString("reason") ?? "No reason provided";

  const fakeBanEmbed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle("The ban hammer has spoken")
    .setAuthor({
      name: inter.member.user.username,
      iconURL: (inter.member as GuildMember).displayAvatarURL({
        extension: "png",
      }),
    })
    .setDescription("The ban hammer has spoken and has taken action")
    .addFields(
      { name: "Member", value: user?.username ?? "Unknown User" },
      { name: "Reason", value: reason }
    )
    .setTimestamp()
    .setFooter({
      text: "KatBot",
      iconURL: (client.user! as User).displayAvatarURL({ extension: "png" }) ?? "",
    });

  await inter.reply({ embeds: [fakeBanEmbed] });
}
