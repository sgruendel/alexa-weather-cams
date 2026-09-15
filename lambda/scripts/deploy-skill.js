import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { SKILL_ID } from '../config.js';

const sourceFile = fileURLToPath(import.meta.url);

export function ensureAskState(statesFile, profile, skillId) {
    let states = {
        askcliStatesVersion: '2020-03-31',
        profiles: {},
    };

    if (existsSync(statesFile)) {
        states = JSON.parse(readFileSync(statesFile, 'utf8'));
    }

    states.profiles ??= {};
    states.profiles[profile] ??= {};
    const existingSkillId = states.profiles[profile].skillId;
    if (existingSkillId && existingSkillId !== skillId) {
        throw new Error(`ASK profile ${profile} targets ${existingSkillId}, not ${skillId}.`);
    }

    if (existingSkillId !== skillId) {
        states.profiles[profile].skillId = skillId;
        mkdirSync(dirname(statesFile), { recursive: true });
        writeFileSync(statesFile, JSON.stringify(states, null, 2) + '\n');
    }
}

if (process.argv[1] && resolve(process.argv[1]) === sourceFile) {
    const profile = process.env.ASK_PROFILE ?? 'default';
    const projectRoot = resolve(dirname(sourceFile), '../..');
    ensureAskState(resolve(projectRoot, '.ask/ask-states.json'), profile, SKILL_ID);

    const result = spawnSync(
        'ask',
        ['deploy', '--profile', profile, ...process.argv.slice(2)],
        { cwd: projectRoot, stdio: 'inherit' },
    );

    if (result.error) {
        throw result.error;
    }

    process.exitCode = result.status ?? 1;
}
