import { Redis } from 'ioredis';

const redisClientSingleton = () => {
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL);
  }
  return null;
};

declare global {
  var redis: undefined | ReturnType<typeof redisClientSingleton>
}

export const redis = globalThis.redis ?? redisClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.redis = redis;
