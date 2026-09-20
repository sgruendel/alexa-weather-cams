import { expect } from 'chai';
import { isHttpRequest, proxyCameraImage } from '../../image-proxy.js';

function request(method = 'GET', rawPath = '/image/Schmuecke-SW/816.jpg') {
    return {
        rawPath,
        requestContext: { http: { method } },
    };
}

describe('APL image proxy', () => {
    it('recognizes Lambda Function URL requests', () => {
        expect(isHttpRequest(request())).to.equal(true);
        expect(isHttpRequest({ request: { type: 'LaunchRequest' } })).to.equal(false);
    });

    it('returns a known DWD camera image with CORS headers', async () => {
        const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
        let requested;
        const result = await proxyCameraImage(request(), async (url, options) => {
            requested = { url, options };
            return new Response(jpeg, { headers: { 'content-type': 'image/jpeg' } });
        });

        expect(requested.url).to.equal('https://opendata.dwd.de/weather/webcam/Schmuecke-SW/Schmuecke-SW_latest_816.jpg');
        expect(requested.options).to.include({ method: 'GET', redirect: 'error' });
        expect(result).to.include({ statusCode: 200, isBase64Encoded: true });
        expect(result.headers).to.include({
            'access-control-allow-origin': '*',
            'content-type': 'image/jpeg',
            'cache-control': 'public, max-age=60',
        });
        expect(Buffer.from(result.body, 'base64')).to.deep.equal(Buffer.from(jpeg));
    });

    it('supports HEAD and CORS preflight requests', async () => {
        const head = await proxyCameraImage(request('HEAD'), async () => new Response(null, {
            headers: { 'content-type': 'image/jpeg' },
        }));
        expect(head).to.include({ statusCode: 200, body: '', isBase64Encoded: false });

        const options = await proxyCameraImage(request('OPTIONS'), async () => {
            throw new Error('OPTIONS must not fetch upstream');
        });
        expect(options.statusCode).to.equal(204);
        expect(options.headers['access-control-allow-methods']).to.equal('GET, HEAD, OPTIONS');
    });

    it('rejects unknown paths, cameras, sizes, and methods without fetching upstream', async () => {
        const noFetch = async () => { throw new Error('invalid requests must not fetch upstream'); };
        for (const event of [
            request('GET', '/other/Schmuecke-SW/816.jpg'),
            request('GET', '/image/Unknown/816.jpg'),
            request('GET', '/image/Schmuecke-SW/640.jpg'),
        ]) {
            expect((await proxyCameraImage(event, noFetch)).statusCode).to.equal(404);
        }
        expect((await proxyCameraImage(request('POST'), noFetch)).statusCode).to.equal(405);
    });

    it('returns a gateway error for failed or invalid upstream responses', async () => {
        const failed = await proxyCameraImage(request(), async () => { throw new Error('network failure'); });
        expect(failed.statusCode).to.equal(502);

        const badStatus = await proxyCameraImage(request(), async () => new Response('missing', {
            status: 404,
            headers: { 'content-type': 'text/plain' },
        }));
        expect(badStatus.statusCode).to.equal(502);

        const badType = await proxyCameraImage(request(), async () => new Response('not an image', {
            headers: { 'content-type': 'text/plain' },
        }));
        expect(badType.statusCode).to.equal(502);

        const badBody = await proxyCameraImage(request(), async () => ({
            ok: true,
            headers: new Headers({ 'content-type': 'image/jpeg' }),
            arrayBuffer: async () => { throw new Error('body read failed'); },
        }));
        expect(badBody.statusCode).to.equal(502);
    });

    it('does not let stream cleanup failures replace proxy responses', async () => {
        const rejectingBody = { cancel: async () => { throw new Error('cancel failed'); } };
        const invalid = await proxyCameraImage(request(), async () => ({
            ok: false,
            headers: new Headers({ 'content-type': 'text/plain' }),
            body: rejectingBody,
        }));
        expect(invalid.statusCode).to.equal(502);
        expect(invalid.headers['access-control-allow-origin']).to.equal('*');

        const head = await proxyCameraImage(request('HEAD'), async () => ({
            ok: true,
            headers: new Headers({ 'content-type': 'image/jpeg' }),
            body: rejectingBody,
        }));
        expect(head.statusCode).to.equal(200);
        expect(head.headers['access-control-allow-origin']).to.equal('*');
    });
});
