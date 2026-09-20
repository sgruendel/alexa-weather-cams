import { cameras } from './cameras.js';
import { DWD_WEBCAM_BASE_URL } from './config.js';

const ALLOWED_SIZES = new Set(['816']);
const CORS_HEADERS = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, HEAD, OPTIONS',
};

export function isHttpRequest(event) {
    return typeof event?.requestContext?.http?.method === 'string';
}

function response(statusCode, headers = {}, body = '') {
    return {
        statusCode,
        headers: { ...CORS_HEADERS, ...headers },
        body,
        isBase64Encoded: false,
    };
}

export async function proxyCameraImage(event, fetchImage = fetch) {
    const method = event.requestContext.http.method;
    if (method === 'OPTIONS') return response(204);
    if (!['GET', 'HEAD'].includes(method)) {
        return response(405, { allow: 'GET, HEAD, OPTIONS' });
    }

    const match = /^\/image\/([A-Za-z0-9-]+)\/(\d+)\.jpg$/.exec(event.rawPath ?? '');
    if (!match || !ALLOWED_SIZES.has(match[2]) || !cameras.some(camera => camera.id === match[1])) {
        return response(404);
    }

    const [, cameraId, size] = match;
    const source = `${DWD_WEBCAM_BASE_URL}/${cameraId}/${cameraId}_latest_${size}.jpg`;
    let upstream;
    try {
        upstream = await fetchImage(source, {
            method,
            redirect: 'error',
            signal: AbortSignal.timeout(8000),
        });
    } catch {
        return response(502);
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    if (!upstream.ok || !/^image\/jpeg(?:;|$)/i.test(contentType)) {
        await upstream.body?.cancel();
        return response(502);
    }

    const headers = {
        'content-type': 'image/jpeg',
        'cache-control': 'public, max-age=60',
    };
    if (method === 'HEAD') {
        await upstream.body?.cancel();
        return response(200, headers);
    }

    let body;
    try {
        body = Buffer.from(await upstream.arrayBuffer()).toString('base64');
    } catch {
        return response(502);
    }
    return {
        ...response(200, headers, body),
        isBase64Encoded: true,
    };
}
