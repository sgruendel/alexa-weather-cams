import { execFile } from 'child_process';
import { expect } from 'chai';

import * as ask from '../ask.js';

function verifyResponse(error, stdout, stderr) {
    const result = ask.verifyResult(error, stderr);
    const { alexaResponses } = result.alexaExecutionInfo;
    expect(alexaResponses.length, 'one response').to.equal(1);
    expect(alexaResponses[0].type, 'speech response').to.equal('Speech');
    expect(alexaResponses[0].content.caption, 'output speech').to.equal('Hier ist die Kamera Hohenpeißenberg Süd.');
}

describe('Wetterkamera Hohenpeißenberg', () => {
    it('should find webcam', (done) => {
        const args = ask.execArgs.concat(['test/integration/hohenpeißenberg.json']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, stderr);
            done();
        });
    });
});
