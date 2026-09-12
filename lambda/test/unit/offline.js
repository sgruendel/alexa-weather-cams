import { expect } from 'chai';
import { get } from 'node:https';
import { SKILL_ID } from '../../config.js';

describe('offline isolation', () => {
    it('preloads a dummy skill ID', () => expect(SKILL_ID).to.equal('amzn1.ask.skill.offline-weather-cams'));
    it('blocks both HTTPS and fetch connections', async () => {
        const error = await new Promise(resolve => get('https://example.com').on('error', resolve));
        expect(error.code).to.equal('ENETUNREACH');
        let fetchError;
        try { await fetch('https://example.com'); } catch (error) { fetchError = error; }
        expect(fetchError?.message).to.contain('Disallowed net connect');
    });
});
