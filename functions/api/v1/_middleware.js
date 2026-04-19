import {
  createApiToken,
  parseBearerToken,
  touchApiTokenLastUsed,
  verifyApiToken,
} from '../../utils/api-token.js';
import { apiError } from '../../utils/api-v1.js';

const DEFAULT_TOKEN_KEY = 'default_api_token:initialized';

async function ensureDefaultApiToken(env) {
  const defaultTokenSecret = String(env.DEFAULT_API_TOKEN || '').trim();
  if (!defaultTokenSecret || !env.img_url) return;

  try {
    const existing = await env.img_url.get(DEFAULT_TOKEN_KEY, { type: 'json' });
    if (existing?.initialized) return;
  } catch {
    const record = await env.img_url.getWithMetadata(DEFAULT_TOKEN_KEY);
    if (record?.metadata?.initialized) return;
  }

  try {
    await createApiToken(
      {
        name: 'Default API Token',
        scopes: ['upload', 'read', 'delete', 'paste'],
        expiresAt: null,
        enabled: true,
      },
      env
    );

    await env.img_url.put(DEFAULT_TOKEN_KEY, 'initialized', { metadata: { initialized: true, createdAt: Date.now() } });
    console.log('[bootstrap] Default API token created.');
  } catch (error) {
    console.warn('[bootstrap] Failed to create default API token:', error?.message);
  }
}

function resolveRequiredScope(request) {
  const pathname = new URL(request.url).pathname.replace(/\/+$/, '');
  const method = String(request.method || 'GET').toUpperCase();

  const base = '/api/v1';
  if (!pathname.startsWith(base)) return '';
  const subPath = pathname.slice(base.length) || '/';

  if (method === 'POST' && subPath === '/upload') return 'upload';
  if (method === 'GET' && subPath === '/files') return 'read';
  if (method === 'GET' && /^\/file\/[^/]+$/.test(subPath)) return 'read';
  if (method === 'GET' && /^\/file\/[^/]+\/info$/.test(subPath)) return 'read';
  if (method === 'DELETE' && /^\/file\/[^/]+$/.test(subPath)) return 'delete';

  if (method === 'POST' && subPath === '/paste') return 'paste';
  if (method === 'GET' && subPath === '/pastes') return 'read';
  if (method === 'GET' && /^\/paste\/[^/]+$/.test(subPath)) return 'read';
  if (method === 'DELETE' && /^\/paste\/[^/]+$/.test(subPath)) return 'delete';

  return '';
}

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return context.next();
  }

  if (context.env?.DEFAULT_API_TOKEN && context.env?.img_url) {
    const initPromise = ensureDefaultApiToken(context.env).catch(() => {});
    if (typeof context.waitUntil === 'function') {
      context.waitUntil(initPromise);
    }
  }

  if (!context.env?.img_url) {
    return apiError(
      'SERVER_MISCONFIGURED',
      'KV binding img_url is not configured.',
      500
    );
  }

  const requiredScope = resolveRequiredScope(context.request);
  if (!requiredScope) {
    return context.next();
  }

  const tokenValue = parseBearerToken(context.request);
  const verifyResult = await verifyApiToken(tokenValue, context.env, requiredScope);

  if (!verifyResult.ok) {
    return apiError(
      verifyResult.code || 'TOKEN_INVALID',
      verifyResult.message || 'API Token is invalid.',
      verifyResult.status || 401
    );
  }

  context.data = context.data || {};
  context.data.apiToken = verifyResult.token;

  const touchPromise = touchApiTokenLastUsed(verifyResult.token.id, context.env).catch((error) => {
    console.warn('Failed to update API token lastUsedAt:', error?.message || error);
  });
  if (typeof context.waitUntil === 'function') {
    context.waitUntil(touchPromise);
  }

  return context.next();
}
