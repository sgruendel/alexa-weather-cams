import { execFile } from 'child_process';
import { expect } from 'chai';

import * as ask from '../ask.js';

function verifyResponse(error, stdout, stderr, expectFn) {
    const result = ask.verifyResult(error, stderr);
    const { alexaResponses } = result.alexaExecutionInfo;
    expect(alexaResponses.length, 'one response').to.equal(1);
    expect(alexaResponses[0].type, 'speech response').to.equal('Speech');
    expectFn(alexaResponses[0].content.caption, 'output speech');
}

describe('FallbackIntent', () => {
    it('should find no webcam for Berlin', (done) => {
        const args = ask.execArgs.concat(['test/integration/berlin.json']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, stderr,
                (val, msg) => expect(val, msg).to.have.string('Dort gibt es leider keine DWD-Wetterkamera.'));
            done();
        });
    });
});
