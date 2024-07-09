import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { db } from "../db";
import { automodRules } from "../schema";
import { and, eq, sql } from "drizzle-orm";
import type { AutoModAction, AutoModRule } from "../modules/automod";

export const command = new SlashCommandBuilder()
  .setName("ratelimit")
  .setDescription("Configure the ratelimit automod")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName("set")
      .setDescription("configure the threshold and time frame")
      .addIntegerOption((opt) =>
        opt
          .setName("max")
          .setDescription(
            "The maximum amount of messages sent before triggering the rule"
          )
          .setRequired(true)
      )
      .addNumberOption((opt) =>
        opt
          .setName("time-frame")
          .setDescription(
            "The time frame between which we record the amount of messages sent"
          )
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("action")
      .setDescription("The action to perform when a ratelimit is triggered")
      .addStringOption((opt) =>
        opt
          .setName("punishment")
          .setDescription("The punishment that applies to the user")
          .setRequired(true)
      )
      .addNumberOption((opt) =>
        opt
          .setName("duration")
          .setDescription(
            "The duration of the action works on Timeouts, Bans defaults to 60s for timeouts"
          )
          .setRequired(false)
      )
  );

function summarize(rule: AutoModRule): string {
  return `Max: \`${rule.max}\`\nTime frame: \`${
    rule.timeFrame
  }s\`\nActions: \`${rule.actions.join(", ")}\`\nAction Duration: \`${
    rule.duration
  }s\``;
}

export async function execute(inter: ChatInputCommandInteraction) {
  if (!inter.guild) return;

  const subCommand = inter.options.getSubcommand(true);
  if (subCommand === "set") {
    const max = inter.options.getInteger("max")!;
    const timeFrame = inter.options.getNumber("time-frame")!;

    const existingRule = await db.query.automodRules.findFirst({
      where: and(
        eq(automodRules.guildId, inter.guild.id),
        sql`rule->>'type' = 'RateLimit'`
      ),
    });

    if (existingRule) {
      const rule: AutoModRule = {
        max,
        timeFrame,
        actions: existingRule.rule.actions,
        duration: existingRule.rule.duration,
        type: "RateLimit",
      };
      await db
        .update(automodRules)
        .set({
          rule,
        })
        .where(eq(automodRules.ruleId, existingRule.ruleId));
      await inter.reply(summarize(rule));
    } else {
      const rule: AutoModRule = {
        max,
        timeFrame,
        actions: ["Warn"],
        duration: 0,
        type: "RateLimit",
      };
      await db.insert(automodRules).values({
        guildId: inter.guild.id,
        rule,
      });
      await inter.reply(summarize(rule));
    }
  } else if (subCommand === "action") {
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

    const existingRule = await db.query.automodRules.findFirst({
      where: and(
        eq(automodRules.guildId, inter.guild.id),
        sql`rule->>'type' = 'RateLimit'`
      ),
    });

    if (existingRule) {
      const rule: AutoModRule = {
        max: existingRule.rule.max,
        timeFrame: existingRule.rule.timeFrame,
        actions: actions,
        duration: duration,
        type: "RateLimit",
      };
      await db
        .update(automodRules)
        .set({
          rule,
        })
        .where(eq(automodRules.ruleId, existingRule.ruleId));
      await inter.reply(summarize(rule));
    } else {
      const rule: AutoModRule = {
        max: 0,
        timeFrame: 0,
        actions: actions,
        duration,
        type: "RateLimit",
      };
      await db.insert(automodRules).values({
        guildId: inter.guild.id,
        rule,
      });
      await inter.reply(summarize(rule));
    }
  }
}
