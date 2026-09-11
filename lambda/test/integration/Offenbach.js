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

describe('Wetterkamera Offenbach', () => {
    it('should find webcams for Offenbach', (done) => {
        const args = ask.execArgs.concat(['test/integration/offenbach.json']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, stderr,
                (val, msg) => expect(val, msg).to.eq('Welche Kamera, Offenbach Ost oder Offenbach West?'));
            done();
        });
    });

    it('should find webcam for Offenbach Ost', (done) => {
        const args = ask.execArgs.concat(['test/integration/offenbach_ost.json']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, stderr,
                (val, msg) => expect(val, msg).to.eq('Hier ist die Kamera Offenbach Ost.'));
            done();
        });
    });

    it('should find webcam for Offenbach West', (done) => {
        const args = ask.execArgs.concat(['test/integration/offenbach_west.json']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, stderr,
                (val, msg) => expect(val, msg).to.eq('Hier ist die Kamera Offenbach West.'));
            done();
        });
    });
});
