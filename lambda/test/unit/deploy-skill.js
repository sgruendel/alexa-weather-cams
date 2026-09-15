import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect } from 'chai';

import { ensureAskState } from '../../scripts/deploy-skill.js';

describe('skill deployment state', function () {
    let directory;

    beforeEach(function () {
        directory = mkdtempSync(join(tmpdir(), 'ask-state-'));
    });

    afterEach(function () {
        rmSync(directory, { recursive: true, force: true });
    });

    it('initializes a target skill for a clean checkout', function () {
        const statesFile = join(directory, '.ask', 'ask-states.json');

        ensureAskState(statesFile, 'default', 'test-skill');

        expect(JSON.parse(readFileSync(statesFile, 'utf8'))).to.deep.equal({
            askcliStatesVersion: '2020-03-31',
            profiles: { default: { skillId: 'test-skill' } },
        });
    });

    it('preserves deployment state for the configured skill', function () {
        const statesFile = join(directory, '.ask', 'ask-states.json');
        const states = {
            askcliStatesVersion: '2020-03-31',
            profiles: { default: { skillId: 'test-skill', deploymentStatus: 'COMPLETE' } },
        };
        mkdirSync(join(directory, '.ask'));
        writeFileSync(statesFile, JSON.stringify(states));

        ensureAskState(statesFile, 'default', 'test-skill');

        expect(JSON.parse(readFileSync(statesFile, 'utf8'))).to.deep.equal(states);
    });

    it('rejects a conflicting target skill', function () {
        const statesFile = join(directory, 'ask-states.json');
        writeFileSync(statesFile, JSON.stringify({
            profiles: { default: { skillId: 'other-skill' } },
        }));

        expect(() => ensureAskState(statesFile, 'default', 'test-skill'))
            .to.throw('ASK profile default targets other-skill, not test-skill.');
    });
});
