import { resolve } from 'node:path';
import { DEFAULT_MODEL } from './provider';

export interface ServerConfig {
  host: string;
  port: number;
  projectId: string;
  dbPath: string;
  corsOrigins: string[];
  staticDir: string;
  emulatorAuth: boolean;
  emulatorHost: string | null;
  apiKey: string;
  model: string;
  providerEnabled: boolean;
}
function flag(env: NodeJS.ProcessEnv, name: string): boolean {
  const value = env[name];
  if (value !== undefined && value !== 'true' && value !== 'false') throw new Error(`Invalid ${name}.`);
  return value === 'true';
}
export function loopbackEmulatorHost(value: string): string {
  if (!/^(?:localhost|127\.0\.0\.1|\[::1\]):[0-9]{1,5}$/.test(value)) throw new Error('Auth emulator must use loopback host:port.');
  const url = new URL(`http://${value}`);
  if (!url.port || Number(url.port) < 1 || Number(url.port) > 65535) throw new Error('Invalid Auth emulator port.');
  return value;
}
export function loadConfig(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): ServerConfig {
  const projectId = env.FIREBASE_PROJECT_ID?.trim() ?? '';
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) throw new Error('FIREBASE_PROJECT_ID is required.');
  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
  const host = env.HOST?.trim() || '127.0.0.1';
  const emulatorAuth = flag(env, 'AI_ALLOW_EMULATOR_AUTH');
  let emulatorHost: string | null = null;
  if (emulatorAuth) {
    if (env.NODE_ENV === 'production' || !projectId.startsWith('demo-')) throw new Error('Emulator authentication requires a demo project outside production.');
    emulatorHost = loopbackEmulatorHost(env.FIREBASE_AUTH_EMULATOR_HOST ?? '');
  }
  const corsOrigins = (env.CORS_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  for (const origin of corsOrigins) {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || url.username || url.password) throw new Error('CORS_ORIGINS must contain exact HTTP(S) origins.');
  }
  const apiKey = (env.OPENAI_API_KEY ?? '').trim();
  const model = env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  const liveAllowed = !emulatorAuth || flag(env, 'OPENAI_ALLOW_EMULATOR_LIVE');
  return {
    host, port, projectId, dbPath: resolve(cwd, env.DB_PATH?.trim() || './data/ai.sqlite'),
    corsOrigins: [...new Set(corsOrigins)], staticDir: resolve(cwd, env.STATIC_DIR?.trim() || '../dist'),
    emulatorAuth, emulatorHost, apiKey, model,
    providerEnabled: liveAllowed && apiKey.length > 0 && model === DEFAULT_MODEL,
  };
}
