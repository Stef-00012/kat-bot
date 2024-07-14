import { createClient } from "redis";

export const redisClient = await createClient({}).connect();
