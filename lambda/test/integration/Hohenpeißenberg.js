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

describe('Wetterkamera Hohenpeißenberg', () => {
    it('should find webcams for Hohenpeißenberg', (done) => {
        const args = ask.execArgs.concat(['test/integration/hohenpeißenberg.json']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, stderr,
                (val, msg) => expect(val, msg)
                    .to.eq('Welche Kamera, Hohenpeißenberg Süd oder Hohenpeißenberg Südwest?'));
            done();
        });
    });

    it('should find webcam for Hohenpeißenberg Südwest', (done) => {
        const args = ask.execArgs.concat(['test/integration/hohenpeißenberg_südwest.json']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, stderr,
                (val, msg) => expect(val, msg).to.eq('Hier ist die Kamera Hohenpeißenberg Südwest.'));
            done();
        });
    });
});
