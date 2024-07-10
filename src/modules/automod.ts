import { eq } from "drizzle-orm";
import { db } from "../db";
import { automodRules } from "../schema";
import { redisClient } from "../redis";
import { PermissionFlagsBits, Routes, type Message } from "discord.js";
import { DateTime } from "luxon";
import { createWarn } from "./warns";

export type AutoModRule = RateLimitRule;

export type AutoModAction = keyof typeof ActionHierarchy;

export enum ActionHierarchy {
  Ban,
  Kick,
  Timeout,
  Warn,
}

export interface RateLimitRule {
  type: "RateLimit";
  max: number;
  timeFrame: number;
  actions: AutoModAction[];
  duration: number;
}

export async function fetchRules(guildId: string): Promise<AutoModRule[]> {
  const rules = await db.query.automodRules.findMany({
    where: eq(automodRules.guildId, guildId),
  });

  return rules.map((x) => x.rule);
}

export const rateLimitMap = new Map();

function computeHierarchy(actions: AutoModAction[]): ActionHierarchy[] {
  return actions.map((x) => ActionHierarchy[x]).sort((a, b) => a - b);
}

function cancelOut(hierarchy: ActionHierarchy[]): ActionHierarchy[] {
  if (
    hierarchy.includes(ActionHierarchy.Ban) ||
    hierarchy.includes(ActionHierarchy.Kick)
  ) {
    return hierarchy.filter((x) => x !== ActionHierarchy.Timeout);
  }

  return hierarchy;
}

async function applyActions(
  actions: AutoModAction[],
  duration: number,
  event: Message<boolean>,
  reason: string = ""
) {
  const applicable = cancelOut(computeHierarchy(actions));
  const guild = event.guild!;
  const memberId = event.author.id;
  const member = event.member ?? (await guild.members.fetch(memberId));
  const selfMember = guild.members.me ?? (await guild.members.fetchMe());

  if (!member) {
    console.warn(
      `No member found in guild ${event.guildId} user id ${memberId}`
    );
    return;
  }

  const targetHighest = member.roles.highest;
  const selfHighest = selfMember.roles.highest;

  if (targetHighest.position >= selfHighest.position) {
    console.warn(
      `Cannot perform actions on user ${memberId} in ${event.guildId}, they're the same or higher role than I am.`
    );
    return;
  }

  for (const action of applicable) {
    if (
      action === ActionHierarchy.Ban &&
      selfMember.permissions.has(PermissionFlagsBits.BanMembers)
    ) {
      await member.ban({ reason, deleteMessageSeconds: 0 });
    } else if (
      action === ActionHierarchy.Kick &&
      selfMember.permissions.has(PermissionFlagsBits.KickMembers)
    ) {
      await member.kick(reason);
    } else if (
      action === ActionHierarchy.Timeout &&
      (!member.communicationDisabledUntilTimestamp ||
        member.communicationDisabledUntilTimestamp < Date.now()) &&
      selfMember.permissions.has(PermissionFlagsBits.ModerateMembers)
    ) {
      const actualDuration = duration < 60 ? 3600 : duration;
      await member.edit({
        communicationDisabledUntil: DateTime.now()
          .plus({ millisecond: Math.ceil(actualDuration * 1000) })
          .toMillis(),
        reason,
      });
    } else if (action === ActionHierarchy.Warn) {
      await createWarn({
        guildId: guild.id,
        modId: selfMember.id,
        reason,
        targetId: memberId,
      });
    }
  }
}

export async function runRules(rules: AutoModRule[], event: Message<boolean>) {
  for (const rule of rules) {
    if (rule.type === "RateLimit") {
      const key = `rateLimit:${event.channelId}:${event.author.id}`;
      const result = await redisClient.incr(key);
      if (result === 1) {
        await redisClient.expire(key, rule.timeFrame);
      }

      if (result > rule.max) {
        // apply actions
        await applyActions(
          rule.actions,
          rule.duration,
          event,
          "exceeded ratelimit thershold"
        ).catch(console.error);
      }
    }
  }
}
