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

export function verifyResult(error, output) {
    expect(error).to.be.null;
    const lastBody = output.lastIndexOf('Response body: "');
    if (lastBody < 0) {
        console.error('response body not found', output);
        expect(lastBody).to.be.greaterThan(0);
    }
    const { result } = JSON.parse(JSON.parse(output.substr(output.indexOf('"', lastBody))));
    if (result.error) {
        console.error('error message in json', result.error);
        expect(result.error, result.error.message).to.be.null;
    }
    return result;
};
