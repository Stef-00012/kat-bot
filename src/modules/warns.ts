import { db } from "../db";
import { memberWarns } from "../schema";

export async function createWarn({
  guildId,
  targetId,
  modId,
  reason,
}: {
  guildId: string;
  targetId: string;
  modId: string;
  reason: string;
}) {
  await db
    .insert(memberWarns)
    .values({ guildId, targetId, moderatorId: modId, reason });
}

// export async function 