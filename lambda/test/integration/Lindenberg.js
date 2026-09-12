import { execFile } from 'child_process';
import { expect } from 'chai';

import * as ask from '../ask.js';

function verifyResponse(error) {
    const result = ask.verifyResult(error);
    const { alexaResponses } = result.alexaExecutionInfo;
    expect(alexaResponses.length, 'one response').to.equal(1);
    expect(alexaResponses[0].type, 'speech response').to.equal('Speech');
    expect(alexaResponses[0].content.caption, 'output speech')
        .to.equal('Hier ist die Kamera Lindenberg Nordnordost.');
}

describe('Wetterkamera Lindenberg', () => {
    it('should find webcam', (done) => {
        const args = ask.execArgs.concat(['test/integration/lindenberg.json']);
        execFile(ask.execFile, args, (error) => {
            verifyResponse(error);
            done();
        });
    });
});
