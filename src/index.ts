import {
  Client,
  GatewayIntentBits,
  PresenceUpdateStatus,
  Routes,
} from "discord.js";
import * as RateLimitCommand from "./commands/ratelimit";
import { rest } from "./rest";
import { ensureGuild } from "./modules/guild";
import { fetchRules, runRules } from "./modules/automod";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.AutoModerationExecution,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

client.on("messageCreate", async (ev) => {
  if (!ev.channel.isTextBased() || !ev.guild) {
    return;
  }

  try {
    // const guild = ev.guild;
    // const config = await ensureGuild(guild.id, guild.name);
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

  const commands = [RateLimitCommand.command];

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
    if (inter.commandName === "ratelimit") {
      await RateLimitCommand.execute(inter);
    }
  }
});

await client.login(Bun.env.BOT_TOKEN);

