import {
  Client,
  GatewayIntentBits,
  PresenceUpdateStatus,
  Routes,
} from "discord.js";
import * as RateLimitCommand from "./commands/ratelimit";
import * as ThresholdCommand from "./commands/threshold";

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

  const commands = [RateLimitCommand.command, ThresholdCommand.command];

  const ch = client.guilds.cache
    .get("795393018764591134")
    ?.channels.cache.get("907306705090646066");
  if (ch?.isTextBased()) {
    ch.send(`
      Hello, I'm new here!
      -# This user is under surveillance by the U.S. FBI.
      -# Do not contact this user, he is the subject of a criminal case under 18 U.S.C. § 2332b effective April 24, 1996. • [Learn more](<https://www.justice.gov/archives/jm/criminal-resource-manual-13-terrorism-transcending-national-boundaries-18-usc-2332b>)
      `);
  }

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
    if (inter.commandName === RateLimitCommand.command.name) {
      await RateLimitCommand.execute(inter);
    } else if (inter.commandName === ThresholdCommand.command.name) {
      await ThresholdCommand.execute(inter);
    }
  }
});

await client.login(Bun.env.BOT_TOKEN);
