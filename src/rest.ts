import { REST } from "discord.js";

export const rest = new REST().setToken(Bun.env.BOT_TOKEN!);
