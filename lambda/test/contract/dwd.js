import { expect } from 'chai';
import { cameras } from '../../cameras.js';
import { handler } from '../../index.js';
import { intentRequest, resolvedSlot } from '../helpers/alexa.js';

// Inspect URLs from actual ASK SDK responses, rather than reconstructing the catalog URLs.
async function emittedUrls(camera) {
    const urls = new Set();
    for (const supportedInterfaces of [{}, { Display: {} }, { 'Alexa.Presentation.APL': {} }]) {
        const webcam = resolvedSlot('webcam', camera.name.value, [{ id: camera.id }]);
        const { response } = await handler(intentRequest('WeatherCamIntent', { webcam }, 'COMPLETED', { supportedInterfaces }), {});
        urls.add(response.card.image.smallImageUrl);
        urls.add(response.card.image.largeImageUrl);
        for (const directive of response.directives ?? []) {
            if (directive.type === 'Display.RenderTemplate') {
                for (const source of directive.template.image.sources) urls.add(source.url);
            } else {
                urls.add(directive.datasources.camera.url);
            }
        }
    }
    return urls;
}

describe('live DWD camera images', () => {
    for (const camera of cameras) {
        describe(camera.name.value, () => {
            let urls;
            before(async () => { urls = [...await emittedUrls(camera)]; });
            for (let index = 0; index < 5; index++) {
                it(`serves emitted image ${index + 1} as JPEG within 10 seconds`, async () => {
                    expect(urls).to.have.length(5);
                    const url = urls[index];
                    const response = await fetch(url, { signal: AbortSignal.timeout(10000), redirect: 'error' });
                    try {
                        expect(response.ok, `${url}: HTTP ${response.status}`).to.equal(true);
                        expect(response.headers.get('content-type'), url).to.match(/^image\/jpeg(?:;|$)/i);
                        const reader = response.body.getReader();
                        try {
                            // Read only the signature, limiting both duration and downloaded data.
                            const bytes = [];
                            while (bytes.length < 3) {
                                const { value, done } = await reader.read();
                                if (done) break;
                                bytes.push(...value.subarray(0, 3 - bytes.length));
                            }
                            expect(bytes, `${url}: JPEG signature`).to.deep.equal([0xff, 0xd8, 0xff]);
                        } finally {
                            await reader.cancel();
                        }
                    } finally {
                        if (!response.body.locked) await response.body.cancel();
                    }
                });
            }
        });
    }
});
