import { expect } from 'chai';
import skill from '../../../skill-package/skill.json' with { type: 'json' };

// Representative devices and edges of the supported HUB viewport profiles.
describe('APL manifest viewports', () => {
    const { supportedViewports } = skill.manifest.apis.custom.interfaces.find(entry => entry.type === 'ALEXA_PRESENTATION_APL');
    for (const [shape, width, height] of [
        ['ROUND', 480, 480],
        ['RECTANGLE', 960, 480],
        ['RECTANGLE', 960, 100],
        ['RECTANGLE', 1279, 599],
        ['RECTANGLE', 1024, 600],
        ['RECTANGLE', 1280, 800],
    ]) {
        it(`supports ${shape} HUB ${width}×${height}`, () => {
            expect(supportedViewports.some(viewport => viewport.mode === 'HUB' && viewport.shape === shape
                && width >= viewport.minWidth && width <= viewport.maxWidth
                && height >= viewport.minHeight && height <= viewport.maxHeight)).to.equal(true);
        });
    }
});
