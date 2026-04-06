import dotenv from 'dotenv';
dotenv.config();

export const PROXIMITY_RADIUS = 130
export const PLAYER_KEY = 'proximity:players';
export const ACTIVE_PAIRS_KEY = 'proximity:active-pairs';
export const GEO_SCALE = 111320;

export const MONGO_URI = process.env.MONGO_URI;

export const REDIS_HOST = process.env.REDIS_HOST;
export const REDIS_PORT = process.env.REDIS_PORT;

export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
