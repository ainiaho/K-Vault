/**
 * 随机图片 API
 * GET /api/random-image
 * 
 * 可选参数:
 *   type: 返回格式 (url|json|redirect) - 默认 url
 *   ext: 图片扩展名过滤 (jpg|png|webp|gif) - 可选
 *   cache: 缓存时间(秒) - 默认 0
 */

import { apiSuccess, apiError, buildAbsoluteUrl } from '../../utils/api-v1.js';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic', 'heif']);

function isImageFile(fileName = '', mimeType = '') {
  const ext = String(fileName).split('.').pop()?.toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return true;
  if (String(mimeType).startsWith('image/')) return true;
  return false;
}

export async function onRequest(context) {
  const { request, env } = context;

  try {
    if (!env.img_url) {
      return apiError('SERVER_ERROR', 'KV not configured.', 500);
    }

    if (!env.TG_BOT_TOKEN) {
      return apiError('SERVER_ERROR', 'Telegram not configured.', 500);
    }

    const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'url';
  const extFilter = url.searchParams.get('ext');
  const cacheSeconds = Number(url.searchParams.get('cache') || 0);

  const imageFiles = [];
  let cursor = undefined;

  do {
    const page = await env.img_url.list({
      prefix: 'img:',
      limit: 1000,
      cursor,
    });

    for (const item of page.keys || []) {
      const record = await env.img_url.getWithMetadata(item.name);
      if (record?.metadata && isImageFile(record.metadata.fileName, record.metadata.ListType)) {
        if (extFilter) {
          const ext = String(record.metadata.fileName).split('.').pop()?.toLowerCase();
          if (ext !== extFilter) continue;
        }
        imageFiles.push({
          id: item.name.replace(/^img:/, ''),
          ...record.metadata,
        });
      }
    }

    cursor = page.list_complete ? undefined : page.cursor;
  } while (!cursor && imageFiles.length < 100);

  for (const prefix of ['', 'vid:', 'aud:', 'doc:']) {
    if (imageFiles.length >= 20) break;
    cursor = undefined;

    do {
      const page = await env.img_url.list({
        prefix,
        limit: 1000,
        cursor,
      });

      for (const item of page.keys || []) {
        if (item.name === 'folder:') continue;
        const record = await env.img_url.getWithMetadata(item.name);
        if (record?.metadata && isImageFile(record.metadata.fileName, record.metadata.ListType)) {
          if (extFilter) {
            const ext = String(record.metadata.fileName).split('.').pop()?.toLowerCase();
            if (ext !== extFilter) continue;
          }
          imageFiles.push({
            id: item.name,
            ...record.metadata,
          });
        }
      }

      cursor = page.list_complete ? undefined : page.cursor;
    } while (!cursor && imageFiles.length < 100);
  }

  if (imageFiles.length === 0) {
    return apiError('NO_IMAGE', 'No images found.', 404);
  }

  const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
  const fileId = randomFile.id;
  const downloadUrl = buildAbsoluteUrl(request, `/file/${fileId}`);

  const headers = new Headers();
  if (cacheSeconds > 0) {
    headers.set('Cache-Control', `public, max-age=${cacheSeconds}`);
  }

  if (type === 'redirect') {
    return Response.redirect(downloadUrl, 302, { headers });
  }

  if (type === 'json') {
    return apiSuccess({
      url: downloadUrl,
      id: fileId,
      name: randomFile.fileName,
      size: randomFile.fileSize,
    }, 200, headers);
  }

  return new Response(downloadUrl, {
    status: 200,
    headers: { ...Object.fromEntries(headers), 'Content-Type': 'text/plain' },
  });
  } catch (error) {
    console.error('random-image error:', error);
    return apiError('INTERNAL_ERROR', error.message || 'Internal error', 500);
  }
}