import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits,
  PresenceUpdateStatus,
  Routes,
} from "discord.js";
import * as RateLimitCommand from "./commands/ratelimit";
import * as ThresholdCommand from "./commands/threshold";
import * as StarboardCommand from "./commands/starboard";
import * as HelpCommand from "./commands/help";
import * as FakeBanCommand from "./commands/fun/ban";
import * as PingCommand from "./commands/ping";

import { rest } from "./rest";
import { fetchRules, runRules } from "./modules/automod";
import { db } from "./db";
import { and, eq, or, sql } from "drizzle-orm";
import {
  starboardConfigs,
  starboardMessages,
  starboardReactors,
} from "./schema";
import { ensureGuild } from "./modules/guild";
import { redisClient } from "./redis";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.AutoModerationExecution,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Reaction, Partials.Message, Partials.User],
});

client.on("messageCreate", async (ev) => {
  if (!ev.channel.isTextBased() || !ev.guild || ev.author.bot) {
    return;
  }

  try {
    const guild = ev.guild;
    await ensureGuild(guild.id, guild.name);

    const rules = await fetchRules(ev.guild.id);
    await runRules(rules, ev);
  } catch (err) {
    console.error(err);
  }
});

client.on("ready", async () => {
  console.log("Client ready");

  client.user!.setPresence({
    activities: [{ name: "Looks maxxing" }],
    status: PresenceUpdateStatus.DoNotDisturb,
  });

  const commands = [
    RateLimitCommand.command,
    ThresholdCommand.command,
    HelpCommand.command,
    FakeBanCommand.command,
    PingCommand.command,
    StarboardCommand.command,
  ];

  await rest.put(
    Routes.applicationGuildCommands(
      client.application!.id,
      "795393018764591134"
    ),
    {
      body: commands,
    }
  );
});

client.on("interactionCreate", async (inter) => {
  if (inter.isCommand() && inter.isChatInputCommand()) {
    try {
      if (inter.commandName === RateLimitCommand.command.name) {
        await RateLimitCommand.execute(inter);
      } else if (inter.commandName === ThresholdCommand.command.name) {
        await ThresholdCommand.execute(inter);
      } else if (inter.commandName === HelpCommand.command.name) {
        await HelpCommand.execute(inter);
      } else if (inter.commandName === FakeBanCommand.command.name) {
        await FakeBanCommand.execute(inter, client);
      } else if (inter.commandName === PingCommand.command.name) {
        await PingCommand.execute(inter);
      } else if (inter.commandName === StarboardCommand.command.name) {
        await StarboardCommand.execute(inter);
      }
    } catch (err) {
      console.error(
        `Failed to execute command ${inter.commandName}: ${String(err)}`
      );
    }
  }
});

client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (!reaction.message.guild) return;
  if (reaction.emoji.name !== "⭐") return;

  const sbConfig = await db.query.starboardConfigs.findFirst({
    where: eq(starboardConfigs.guildId, reaction.message.guild.id),
  });

  if (!sbConfig) return;

  const reactCount = await redisClient.incr(`starboardReactors:${user.id}`);
  if (reactCount === 1) {
    await redisClient.expire(`starboardReactors:${user.id}`, 10000);
  }

  if (reactCount >= 3) {
    return;
  }

  if (reaction.partial) {
    await reaction.fetch();
  }

  const author = reaction.message.author;
  if (!author /*|| author.id === user.id*/) {
    return;
  }

  const reactor = await db.query.starboardReactors.findFirst({
    where: and(
      eq(starboardMessages.messageId, reaction.message.id),
      eq(starboardReactors.reactorId, user.id)
    ),
  });

  if (reactor) return;

  let message = await db.query.starboardMessages.findFirst({
    where: or(
      eq(starboardMessages.messageId, reaction.message.id),
      eq(starboardMessages.postedMessageId, reaction.message.id)
    ),
  });

  if (!message) {
    const insertedRows = await db
      .insert(starboardMessages)
      .values({
        channelId: reaction.message.channelId,
        messageId: reaction.message.id,
        starCount: reaction.count!,
      })
      .returning();
    message = insertedRows[0]!;
  } else {
    const updatedRows = await db
      .update(starboardMessages)
      .set({ starCount: sql`${starboardMessages.starCount} + 1` })
      .where(eq(starboardMessages.messageId, reaction.message.id))
      .returning();
    message = updatedRows[0]!;
  }

  await db
    .insert(starboardReactors)
    .values({ messageId: reaction.message.id, reactorId: user.id });

  const guild = reaction.message.guild;
  const channel = await guild.channels.fetch(sbConfig.channelId);
  const me = await guild.members.fetchMe();

  if (
    !channel ||
    !channel.permissionsFor(me).has(PermissionFlagsBits.SendMessages) ||
    !channel.isTextBased()
  ) {
    await db
      .delete(starboardConfigs)
      .where(eq(starboardConfigs.guildId, guild.id));
    return;
  }
  if (
    message.starCount >= sbConfig.minStars &&
    !message.posted &&
    message.messageId === reaction.message.id
  ) {
    // gotta post it

    await reaction.message.fetch();

    const embed = new EmbedBuilder()
      .setAuthor({
        name: author.username,
        iconURL: author.displayAvatarURL(),
      })
      .addFields({ name: "Source", value: reaction.message.url })
      .setTimestamp()
      .setColor("#fcba03");

    if (reaction.message.content && reaction.message.content.length > 0) {
      embed.setDescription(reaction.message.content);
    }

    const msg = await channel.send({
      embeds: [embed],
      files: reaction.message.attachments.map((x) => x.url),
      content: `⭐ **${message.starCount}**`,
    });
    // await msg.react("⭐");
    await db
      .update(starboardMessages)
      .set({ posted: true, postedMessageId: msg.id })
      .where(eq(starboardMessages.messageId, reaction.message.id));
  } else if (message.posted) {
    await channel.messages.edit(message.postedMessageId!, {
      content: `⭐ **${message.starCount}**`,
    });
  }
});

client.on("messageReactionRemove", async (reaction, user) => {
  if (user.bot) return;
  if (!reaction.message.guild) return;
  if (reaction.emoji.name !== "⭐") return;

  const sbConfig = await db.query.starboardConfigs.findFirst({
    where: eq(starboardConfigs.guildId, reaction.message.guild.id),
  });

  if (!sbConfig) return;

  const reactCount = await redisClient.incr(`starboardReactors:${user.id}`);
  if (reactCount === 1) {
    await redisClient.expire(`starboardReactors:${user.id}`, 10000);
  }

  if (reactCount >= 3) {
    return;
  }

  if (reaction.partial) {
    await reaction.fetch();
  }

  const author = reaction.message.author;
  if (!author /*|| author.id === user.id*/) {
    return;
  }

  let message = await db.query.starboardMessages.findFirst({
    where: or(
      eq(starboardMessages.messageId, reaction.message.id),
      eq(starboardMessages.postedMessageId, reaction.message.id)
    ),
  });

  const reactor = await db.query.starboardReactors.findFirst({
    where: and(
      eq(starboardMessages.messageId, reaction.message.id),
      eq(starboardReactors.reactorId, user.id)
    ),
  });
  if (!reactor) return;

  if (message) {
    const updatedRows = await db
      .update(starboardMessages)
      .set({ starCount: sql`${starboardMessages.starCount} - 1` })
      .where(eq(starboardMessages.messageId, reaction.message.id))
      .returning();
    message = updatedRows[0]!;

    await db
      .delete(starboardReactors)
      .where(
        and(
          eq(starboardReactors.messageId, message.messageId),
          eq(starboardReactors.reactorId, user.id)
        )
      );
  } else {
    return;
  }

  const guild = reaction.message.guild;
  const channel = await guild.channels.fetch(sbConfig.channelId);
  const me = await guild.members.fetchMe();

  if (
    !channel ||
    !channel.permissionsFor(me).has(PermissionFlagsBits.SendMessages) ||
    !channel.isTextBased()
  ) {
    await db
      .delete(starboardConfigs)
      .where(eq(starboardConfigs.guildId, guild.id));
    return;
  }

  if (message.starCount < sbConfig.minStars && message.posted) {
    await channel.messages.delete(message.postedMessageId!);
    await db
      .update(starboardMessages)
      .set({ posted: false, postedMessageId: null })
      .where(eq(starboardMessages.postedMessageId, message.postedMessageId!));
  }

  if (message.posted && message.messageId === reaction.message.id) {
    await channel.messages.edit(message.postedMessageId!, {
      content: `⭐ **${message.starCount}**`,
    });
  }
});

await client.login(Bun.env.BOT_TOKEN);
