import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputApplicationCommandData,
} from "discord.js";
import { db } from "../db";
import { and, eq } from "drizzle-orm";
import { warnThresholds } from "../schema";
import type { AutoModAction } from "../modules/automod";

export const command = new SlashCommandBuilder()
  .setName("threshold")
  .setDescription("Set warning threshold")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((opt) =>
    opt
      .setName("set")
      .setDescription("Add a new warn threshold")
      .addIntegerOption((o) =>
        o
          .setName("warns")
          .setDescription("minimum warnings required to trigger the threshold")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("punishment")
          .setDescription("The punishment that applies to the user")
          .setRequired(true)
      )
      .addNumberOption((opt) =>
        opt.setName("duration").setDescription("Set duration of the punishment")
      )
  )
  .addSubcommand((opt) =>
    opt
      .setName("remove")
      .setDescription("Remove a warn threshold")
      .addIntegerOption((o) =>
        o
          .setName("warns")
          .setDescription(
            "the warn count you want to remove the threshold from"
          )
          .setRequired(true)
      )
  )
  .addSubcommand((opt) =>
    opt.setName("list").setDescription("List the warning thresholds")
  );

export async function execute(inter: ChatInputCommandInteraction) {
  const subCommand = inter.options.getSubcommand();

  if (subCommand === "set") {
    const minWarns = inter.options.getInteger("warns")!;
    const threshold = await db.query.warnThresholds.findFirst({
      where: and(
        eq(warnThresholds.guildId, inter.guildId!),
        eq(warnThresholds.minWarns, minWarns)
      ),
    });

    const punishment = inter.options
      .getString("punishment")!
      .toLowerCase()
      .split(" ")
      .map((x) => x.replace(/[^a-z]/, ""));
    const duration = inter.options.getNumber("duration")! ?? 0;
    const actions: AutoModAction[] = [];
    for (const p of punishment) {
      if (p === "timeout") {
        actions.push("Timeout");
      } else if (p === "warn") {
        actions.push("Warn");
      } else {
        return await inter.reply(`${p} is not a valid action.`);
      }
    }

    if (!threshold) {
      await db
        .insert(warnThresholds)
        .values({ actions, duration, guildId: inter.guildId!, minWarns });
    } else {
      await db
        .update(warnThresholds)
        .set({ actions, duration, guildId: inter.guildId!, minWarns })
        .where(eq(warnThresholds.id, threshold.id));
    }

    await inter.reply(`Ok. ${threshold ? "Rule updated." : ""}`);
  } else if (subCommand === "remove") {
    const minWarns = inter.options.getInteger("warns")!;

    await db
      .delete(warnThresholds)
      .where(
        and(
          eq(warnThresholds.guildId, inter.guildId!),
          eq(warnThresholds.minWarns, minWarns)
        )
      );
  } else if (subCommand === "list") {
  }
}
