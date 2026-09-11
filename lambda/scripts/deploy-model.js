import { spawnSync } from 'node:child_process';

import { SKILL_ID } from '../config.js';

const result = spawnSync(
    'ask',
    [
        'smapi',
        'set-interaction-model',
        '--skill-id',
        SKILL_ID,
        '--stage',
        'development',
        '--locale',
        'de-DE',
        '--interaction-model',
        'file:../skill-package/interactionModels/custom/de-DE.json',
        '--profile',
        'default',
    ],
    { stdio: 'inherit' },
);

if (result.error) {
    throw result.error;
}

process.exitCode = result.status ?? 1;
