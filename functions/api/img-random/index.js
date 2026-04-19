/**
 * 随机图片 API
 * GET /api/img-random
 */

import { apiSuccess, apiError, buildAbsoluteUrl } from '../../utils/api-v1.js';

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic', 'heif']);

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'url';

  if (!env.img_url) {
    return apiError('SERVER_ERROR', 'KV not configured.', 500);
  }

  const page = await env.img_url.list({ prefix: 'img:', limit: 50 });
  const keys = (page.keys || []).map(k => k.name).filter(k => {
    const ext = k.replace(/^img:/, '').split('.').pop()?.toLowerCase();
    return IMAGE_EXTS.has(ext);
  });

  if (keys.length === 0) {
    return apiError('NO_IMAGE', 'No images found.', 404);
  }

  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  const fileId = randomKey.replace(/^img:/, '');
  const downloadUrl = buildAbsoluteUrl(request, `/file/${fileId}`);

  if (type === 'json') {
    return apiSuccess({ url: downloadUrl, id: fileId });
  }

  if (type === 'redirect') {
    return Response.redirect(downloadUrl, 302);
  }

  return new Response(downloadUrl, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  });
}