import { eq } from "drizzle-orm";
import { db } from "../db";
import { guilds } from "../schema";

export async function ensureGuild(
  id: string,
  name: string
): Promise<typeof guilds.$inferSelect> {
  let guild = await db.query.guilds.findFirst({ where: eq(guilds.id, id) });
  if (!guild) {
    const returnedRows = await db
      .insert(guilds)
      .values({
        id,
        name,
      })
      .returning();

    guild = returnedRows[0]!;
  }
  return guild;
}
