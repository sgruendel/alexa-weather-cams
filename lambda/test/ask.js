import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect } from 'chai';

export const execFile = process.execPath;
// see https://github.com/alexa/ask-cli/issues/173
export const execArgs = [
    fileURLToPath(new URL('./run-dialog.js', import.meta.url)),
    '-l',
    'de-DE',
    '-g',
    'development',
    '--save-skill-io',
    'output.json',
    '-r',
];

export function verifyResult(error, skillIoFile = 'output.json') {
    expect(error).to.be.null;
    const { invocations } = JSON.parse(readFileSync(skillIoFile, 'utf8'));
    const { body } = invocations[invocations.length - 1].response;
    expect(body.status, 'simulation status').to.equal('SUCCESSFUL');
    const { result } = body;
    if (result.error) {
        console.error('error message in json', result.error);
        expect(result.error, result.error.message).to.be.null;
    }
    return result;
};
