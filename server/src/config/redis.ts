import Redis from "ioredis";
import { logger } from "./logger";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) {
      return null;
    }
    return Math.min(times * 200, 2000);
  },
});

redis.on("error", (err) => {
  logger.error("Redis client error", { message: err.message });
});

redis.on("connect", () => {
  logger.info("Connected to Redis");
});

export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

export default redis;
