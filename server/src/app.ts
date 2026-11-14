import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express, { type ErrorRequestHandler } from 'express';
import type { ParseTransactionRequest } from '../../src/types/ai';
import { createFirebaseVerifier, MAX_BEARER_LENGTH, type TokenVerifier } from './auth';
import type { ServerConfig } from './config';
import { ApiError } from './errors';
import { payloadDigest, requestKey, validateRequest } from './input';
import { extractTransaction, validateCompletion, type ProviderExtraction } from './provider';
import { ReservationStore } from './reservations';

export const JSON_BODY_LIMIT = 3 * 1024 * 1024;
export interface AppDependencies {
  store: ReservationStore;
  verifyToken?: TokenVerifier;
  extract?: (input: ParseTransactionRequest, apiKey: string, model: string) => Promise<ProviderExtraction>;
  log?: (event: string, fields: Record<string, unknown>) => void;
}
export function createApp(config: ServerConfig, dependencies: AppDependencies) {
  const app = express();
  const verifyToken = dependencies.verifyToken ?? createFirebaseVerifier(config);
  const extract = dependencies.extract ?? extractTransaction;
  const log = dependencies.log ?? ((event, fields) => console.info(JSON.stringify({ event, ...fields })));
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({ 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'credentialless', 'X-Content-Type-Options': 'nosniff' });
    res.setTimeout(35_000, () => res.destroy());
    const origin = req.get('Origin');
    if (origin) {
      res.vary('Origin');
      if (!config.corsOrigins.includes(origin) && origin !== `${req.protocol}://${req.get('host')}`) {
        res.status(403).json({ error: { code: 'AI_UNAVAILABLE', message: 'This origin is not allowed.' } });
        return;
      }
      res.set('Access-Control-Allow-Origin', origin);
    }
    if (req.method === 'OPTIONS') {
      const method = req.get('Access-Control-Request-Method');
      const headers = (req.get('Access-Control-Request-Headers') ?? '').split(',').map((header) => header.trim().toLowerCase()).filter(Boolean);
      if (!origin || !method || !['GET', 'POST'].includes(method) || headers.some((header) => !['authorization', 'content-type'].includes(header))) {
        res.sendStatus(403); return;
      }
      res.set({ 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '600' });
      res.sendStatus(204); return;
    }
    next();
  });
  app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.post('/api/parse-transaction', async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      const bearer = req.get('Authorization');
      if (!bearer || bearer.length > MAX_BEARER_LENGTH + 7 || !/^Bearer [A-Za-z0-9_.-]+$/.test(bearer)) throw new ApiError('AI_AUTH_REQUIRED');
      res.locals.uid = await verifyToken(bearer.slice(7));
      next();
    } catch { next(new ApiError('AI_AUTH_REQUIRED')); }
  }, express.json({ limit: JSON_BODY_LIMIT, strict: true, inflate: false }), async (req, res) => {
    if (!req.is('application/json')) throw new ApiError('AI_INPUT_INVALID');
    const input = validateRequest(req.body, Date.now());
    const digest = payloadDigest(input);
    const key = requestKey(res.locals.uid as string, input.requestId);
    const reservation = dependencies.store.reserveRequest(key, res.locals.uid as string, digest, config.providerEnabled);
    if (reservation.kind === 'error') throw new ApiError(reservation.code);
    if (reservation.kind === 'completed') {
      log('ai_extraction_cache_hit', { requestKey: key, model: config.model });
      res.json(reservation.result); return;
    }
    let extraction: ProviderExtraction;
    try {
      extraction = await extract(input, config.apiKey, config.model);
      extraction.response = validateCompletion(extraction.response);
    } catch {
      // A timeout/error may still be billed. Quota and this ID remain consumed.
      dependencies.store.failRequest(key, digest);
      log('ai_extraction_failed', { requestKey: key, model: config.model, code: 'REQUEST_FAILED' });
      throw new ApiError('REQUEST_FAILED');
    }
    if (!dependencies.store.completeRequest(key, digest, extraction.response)) throw new ApiError('REQUEST_EXPIRED');
    const { latencyMs, inputTokens, outputTokens, cachedInputTokens, cacheWriteTokens } = extraction.metrics;
    log('ai_extraction_completed', { requestKey: key, model: config.model, latencyMs, inputTokens, outputTokens, cachedInputTokens, cacheWriteTokens });
    res.json(extraction.response);
  });
  app.use('/api', (_req, res) => { res.status(404).json({ error: { code: 'AI_INPUT_INVALID', message: 'Unknown API endpoint.' } }); });
  if (existsSync(join(config.staticDir, 'index.html'))) {
    app.use(express.static(config.staticDir, { index: false }));
    app.get('/{*path}', (_req, res) => { res.sendFile(join(config.staticDir, 'index.html')); });
  }
  app.use((_req, res) => { res.status(404).json({ error: { code: 'AI_INPUT_INVALID', message: 'Unknown endpoint.' } }); });
  const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (res.headersSent) { res.destroy(); return; }
    const bodyError = error && typeof error === 'object' && 'type' in error && ['entity.too.large', 'entity.parse.failed', 'encoding.unsupported', 'charset.unsupported', 'request.aborted', 'request.size.invalid'].includes(String(error.type));
    const safe = error instanceof ApiError ? error : new ApiError(bodyError ? 'AI_INPUT_INVALID' : 'AI_UNAVAILABLE');
    res.set('Cache-Control', 'no-store').status(safe.status).json({ error: { code: safe.code, message: safe.message } });
  };
  app.use(errors);
  return app;
}
