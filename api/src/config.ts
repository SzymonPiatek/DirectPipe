import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'node:path';

dotenvConfig({ path: resolve(__dirname, '../../envs/api.env') });

/** Typed, centralized access to environment variables. */
export const config = {
  port: Number(process.env.PORT ?? 4000),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  turnSecret: process.env.TURN_SECRET as string | undefined,
  turnHost: process.env.TURN_HOST ?? 'localhost',
} as const;
