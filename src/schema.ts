import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { type AutoModRule } from "./modules/automod";

export const guilds = pgTable("guilds", {
  id: varchar("id", { length: 28 }).notNull().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  guildId: varchar("guild_id", { length: 28 })
    .notNull()
    .primaryKey()
    .references(() => guilds.id),
  event: jsonb("event").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const automodRules = pgTable("automod_rules", {
  ruleId: serial("rule_id").notNull(),
  guildId: varchar("guild_id", { length: 28 }).notNull(),
  rule: jsonb("rule").$type<AutoModRule>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const memberWarns = pgTable("member_warns", {
  guildId: varchar("guild_id", { length: 28 }).notNull(),
  targetId: varchar("user_id", { length: 28 }).notNull(),
  moderatorId: varchar("moderator_id", { length: 28 }).notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const warnThresholds = pgTable("warn_thresholds", {
  id: serial("id").notNull(),
  guildId: varchar("guild_id", { length: 28 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  minWarns: integer("min_warns").notNull(),
  actions: varchar("actions", { length: 16 }).array().notNull(),
  duration: doublePrecision("duration").notNull(),
});
