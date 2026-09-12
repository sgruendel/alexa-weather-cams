import { expect } from 'chai';
import { cameras, cameraCatalog, resolveCamera } from '../../cameras.js';
import { resolvedSlot } from '../helpers/alexa.js';

const slot = (spoken, ids) => resolvedSlot('webcam', spoken, ids.map(id => ({ id })));
const hamburg = ['Hamburg-SO', 'Hamburg-SW'];
describe('camera resolution', () => {
    it('uses the named slot type and validates the catalog', () => {
        expect(cameraCatalog({ interactionModel: { languageModel: { types: [
            { name: 'OTHER', values: [] }, { name: 'LIST_OF_WEBCAMS', values: cameras },
        ] } } })).to.equal(cameras);
        expect(new Set(cameras.map(camera => camera.id)).size).to.equal(cameras.length);
        for (const camera of cameras) {
            expect(camera.id).to.match(/^[A-Za-z]+-[A-Z]+$/);
            expect(camera.name.value.trim()).not.to.equal('');
        }
    });
    for (const spoken of ['Hamburg Südwest', ' HAMBURG SÜDWEST ', ' Hamburg ELBABWÄRTS ']) {
        for (const ids of [hamburg, [...hamburg].reverse()]) {
            it(`prefers exact ${spoken} with ${ids}`, () => {
                expect(resolveCamera(slot(spoken, ids), hamburg).camera.id).to.equal('Hamburg-SW');
            });
        }
    }
    it('narrows direction-only answers against pending IDs', () => {
        expect(resolveCamera(slot('Südwest', ['Schmuecke-SW', 'Hamburg-SW']), hamburg).camera.id).to.equal('Hamburg-SW');
    });
    it('keeps multiple survivors ambiguous and deduplicates IDs', () => {
        expect(resolveCamera(slot('Hamburg', [...hamburg, 'Hamburg-SO']), hamburg).choices.map(c => c.id)).to.deep.equal(hamburg);
        expect(resolveCamera(slot('Hamburg', hamburg), ['Offenbach-O']).kind).to.equal('ambiguous');
    });
    it('does not choose arbitrarily when exact synonyms collide', () => {
        const catalog = cameras.slice(0, 2).map(camera => ({ ...camera, name: { value: 'Shared' } }));
        expect(resolveCamera(slot('Shared', hamburg), [], catalog).kind).to.equal('ambiguous');
    });
    for (const value of [undefined, {}, { value: 'Hamburg' }, slot('', hamburg), slot('Hamburg', []),
        slot('Hamburg', ['unknown']), slot('Hamburg', ['Hamburg-SO', 'unknown']),
        { value: 'Hamburg', resolutions: { resolutionsPerAuthority: [] } },
        { value: 'Hamburg', resolutions: { resolutionsPerAuthority: [null] } },
        resolvedSlot('webcam', 'Hamburg', [], 'ER_ERROR_TIMEOUT'),
        { value: 'Hamburg', resolutions: { resolutionsPerAuthority: [{ status: { code: 'ER_SUCCESS_MATCH' } }] } },
        { value: 'Hamburg', resolutions: { resolutionsPerAuthority: [{ status: { code: 'ER_SUCCESS_MATCH' }, values: [{}] }] } },
    ]) {
        it(`rejects unusable data ${JSON.stringify(value)}`, () => expect(resolveCamera(value).kind).to.equal('unusable'));
    }
    it('distinguishes explicit no-match and leaves inputs untouched', () => {
        expect(resolveCamera(resolvedSlot('webcam', 'Berlin', [], 'ER_SUCCESS_NO_MATCH')).kind).to.equal('no-match');
        const input = slot('Hamburg', hamburg);
        const before = structuredClone(input);
        resolveCamera(input);
        expect(input).to.deep.equal(before);
    });
});

describe('navigation decisions', () => {
    it('wraps in both directions and rejects unknown current cameras', async () => {
        const { adjacentCamera } = await import('../../cameras.js');
        expect(adjacentCamera(cameras[0].id, -1).id).to.equal(cameras.at(-1).id);
        expect(adjacentCamera(cameras.at(-1).id, 1).id).to.equal(cameras[0].id);
        expect(adjacentCamera('unknown', 1)).to.equal(undefined);
    });
});
