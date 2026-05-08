import IORedis, { type RedisOptions } from "ioredis";

function createRedisOptions(url: string): RedisOptions {
  const options: RedisOptions = {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  };

  if (url.startsWith("rediss://")) {
    options.tls = {};
  }

  return options;
}

export function createRedisConnection(
  url = process.env.REDIS_URL ?? "redis://localhost:6379",
) {
  return new IORedis(url, createRedisOptions(url));
}
