import { and, desc, eq, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { automodRules, memberWarns, warnThresholds } from "../schema";
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
  const selfMember = guild.members.me ?? (await guild.members.fetchMe());
  let member = event.member ?? (await guild.members.fetch(memberId));

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
      selfMember.permissions.has(PermissionFlagsBits.ModerateMembers)
    ) {
      const actualDuration = duration < 60 ? 3600 : duration;
      const wannaTimeoutUntil = DateTime.now()
        .plus({ millisecond: Math.ceil(actualDuration * 1000) })
        .toMillis();
      if (
        !member.communicationDisabledUntilTimestamp ||
        member.communicationDisabledUntilTimestamp < Date.now()
      ) {
        /// not muted
        await member.edit({
          communicationDisabledUntil: wannaTimeoutUntil,
          reason,
        });
      } else {
        // already muted, try to resize
        const mutedUntil = member.communicationDisabledUntilTimestamp;
        if (mutedUntil < wannaTimeoutUntil) {
          await member.edit({
            communicationDisabledUntil: wannaTimeoutUntil,
            reason,
          });
        }
      }
    }
    member = await guild.members.fetch(memberId);
  }
}

// Runs all the rules against this event,
// the actions required to be performed are collected into a HashSet which guarantees uniqueness
// the warning thresholds are also ran because one of the automod rules could warn the user which would
// result in an action being performed on them
// longest duration is picked out of all rules
// side note: If the user is kicked, should the member be timed out when they join back? Assuming
// the actions set has: Kick, Timeout
export async function runRules(rules: AutoModRule[], event: Message<boolean>) {
  const guild = event.guild!;
  const memberId = event.author.id;
  const selfMember = guild.members.me ?? (await guild.members.fetchMe());
  const actions: Set<AutoModAction> = new Set();
  let duration = 0;
  let reasons = [];

  for (const rule of rules) {
    if (rule.type === "RateLimit") {
      const key = `rateLimit:${event.channelId}:${event.author.id}`;
      const result = await redisClient.incr(key);
      if (result === 1) {
        await redisClient.expire(key, rule.timeFrame);
      }

      if (result > rule.max) {
        if (rule.duration > duration) {
          duration = rule.duration;
        }

        const reason = "Exceeded ratelimit threshold.";
        reasons.push(reason);
        for (const act of rule.actions) {
          if (act === "Warn") {
            await createWarn({
              guildId: event.guildId!,
              modId: selfMember.id,
              reason,
              targetId: memberId,
            });
          } else {
            actions.add(act);
          }
        }
      }
    }
  }

  if (actions.size === 0) {
    return;
  }

  const rows = await db
    .select({ warnCount: sql`COUNT(1)` })
    .from(memberWarns)
    .where(
      and(
        eq(memberWarns.guildId, event.guildId!),
        eq(memberWarns.targetId, event.author.id)
      )
    );
  const firstRow = rows[0]!;
  const warnCount = Number(firstRow.warnCount);

  const warnThreshold = await db.query.warnThresholds.findFirst({
    where: and(
      eq(warnThresholds.guildId, event.guildId!),
      lte(warnThresholds.minWarns, warnCount)
    ),
    orderBy: desc(warnThresholds.minWarns),
  });

  if (warnThreshold) {
    for (const act of warnThreshold.actions) {
      actions.add(act as AutoModAction);
    }
    if (warnThreshold.duration > duration) {
      duration = warnThreshold.duration;
    }
    reasons.push(`Exceeded warning threshold ${warnThreshold.minWarns}`);
  }
  await applyActions(Array.from(actions), duration, event, reasons.join("\n"));
}
