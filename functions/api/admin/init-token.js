import { createApiToken } from '../../utils/api-token.js';
import { apiError, apiSuccess } from '../../utils/api-v1.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DEFAULT_API_TOKEN) {
    return apiError('NOT_CONFIGURED', 'DEFAULT_API_TOKEN not set in environment.', 400);
  }

  if (!env.img_url) {
    return apiError('SERVER_ERROR', 'KV binding not configured.', 500);
  }

  const body = await request.json().catch(() => ({}));
  const secret = body?.secret || env.DEFAULT_API_TOKEN;

  try {
    const result = await createApiToken(
      {
        name: body?.name || 'Default Token',
        scopes: body?.scopes || ['upload', 'read', 'delete', 'paste'],
        expiresAt: null,
        enabled: true,
      },
      env
    );

    return apiSuccess({
      token: result.token,
      tokenInfo: result.record,
    });
  } catch (error) {
    return apiError('CREATE_FAILED', error.message || 'Failed to create token.', 400);
  }
}