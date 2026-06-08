import Redis from "ioredis";

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
  console.error("Redis client error:", err);
});

redis.on("connect", () => {
  console.log("Connected to Redis");
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
