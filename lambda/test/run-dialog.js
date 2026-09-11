import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { SKILL_ID } from '../config.js';

const askArgs = process.argv.slice(2);
const replayOptionIndex = askArgs.findIndex(arg => arg === '--replay' || arg === '-r');
const replayFile = askArgs[replayOptionIndex + 1];

if (replayOptionIndex < 0 || !replayFile) {
    throw new Error('An ASK CLI replay file is required.');
}

const replay = JSON.parse(readFileSync(replayFile, 'utf8'));
const tempDirectory = mkdtempSync(path.join(tmpdir(), 'alexa-weather-cams-'));
const tempReplayFile = path.join(tempDirectory, 'replay.json');

try {
    replay.skillId = SKILL_ID;
    writeFileSync(tempReplayFile, JSON.stringify(replay), 'utf8');
    askArgs[replayOptionIndex + 1] = tempReplayFile;

    const result = spawnSync('ask', ['dialog', ...askArgs], { stdio: 'inherit' });
    if (result.error) {
        throw result.error;
    }
    process.exitCode = result.status ?? 1;
} finally {
    rmSync(tempDirectory, { recursive: true, force: true });
}
