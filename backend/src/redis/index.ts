import { Redis } from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from '../config/config.ts';

if(!REDIS_HOST || !REDIS_PORT) throw new Error("REDIS_HOST or REDIS_PORT is not defined");

export const redis = new Redis({
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
});