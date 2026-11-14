import { createRemoteJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import { loopbackEmulatorHost, type ServerConfig } from './config';
import { ApiError } from './errors';

export const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
export const MAX_BEARER_LENGTH = 16_384;
export type TokenVerifier = (token: string) => Promise<string>;

export function assertFirebaseClaims(payload: JWTPayload, projectId: string, now = Math.floor(Date.now() / 1000)): string {
  const { exp, iat, auth_time: authTime, sub, aud, iss } = payload;
  if (aud !== projectId || iss !== `https://securetoken.google.com/${projectId}` ||
      typeof sub !== 'string' || sub.length < 1 || sub.length > 128 ||
      typeof exp !== 'number' || !Number.isSafeInteger(exp) || exp <= now ||
      typeof iat !== 'number' || !Number.isSafeInteger(iat) || iat < 0 || iat > now || exp <= iat ||
      typeof authTime !== 'number' || !Number.isSafeInteger(authTime) || authTime < 0 || authTime > now || authTime > iat) {
    throw new ApiError('AI_AUTH_REQUIRED');
  }
  return sub;
}
export async function verifySignedFirebaseToken(token: string, projectId: string, keys: JWTVerifyGetKey): Promise<string> {
  const { payload, protectedHeader } = await jwtVerify(token, keys, {
    algorithms: ['RS256'], issuer: `https://securetoken.google.com/${projectId}`, audience: projectId,
    requiredClaims: ['exp', 'iat', 'auth_time', 'sub'],
  });
  if (typeof protectedHeader.kid !== 'string' || !protectedHeader.kid) throw new ApiError('AI_AUTH_REQUIRED');
  return assertFirebaseClaims(payload, projectId);
}
export function createFirebaseVerifier(config: Pick<ServerConfig, 'projectId' | 'emulatorAuth' | 'emulatorHost'>): TokenVerifier {
  let remoteKeys: JWTVerifyGetKey | undefined;
  return async (token) => {
    try {
      if (!token || token.length > MAX_BEARER_LENGTH) throw new Error('Invalid bearer.');
      if (config.emulatorAuth) {
        if (!config.projectId.startsWith('demo-') || process.env.NODE_ENV === 'production' || !config.emulatorHost) throw new Error('Invalid emulator configuration.');
        loopbackEmulatorHost(config.emulatorHost);
        const header = decodeProtectedHeader(token);
        if (header.alg !== 'none' || token.split('.').length !== 3 || token.split('.')[2] !== '') throw new Error('Invalid emulator token.');
        const uid = assertFirebaseClaims(decodeJwt(token), config.projectId);
        // The explicit development mode still requires a real, enabled emulator account.
        const response = await fetch(`http://${config.emulatorHost}/identitytoolkit.googleapis.com/v1/accounts:lookup?key=demo-key`, {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }),
        });
        if (!response.ok) throw new Error('Emulator authentication failed.');
        const body: unknown = await response.json();
        if (!body || typeof body !== 'object' || !('users' in body) || !Array.isArray(body.users) || body.users.length !== 1 || body.users[0]?.localId !== uid || body.users[0]?.disabled === true) throw new Error('Emulator account unavailable.');
        return uid;
      }
      remoteKeys ??= createRemoteJWKSet(new URL(FIREBASE_JWKS_URL), { timeoutDuration: 5000 });
      return await verifySignedFirebaseToken(token, config.projectId, remoteKeys);
    } catch {
      throw new ApiError('AI_AUTH_REQUIRED');
    }
  };
}
