import { execFile } from 'child_process';
import { expect } from 'chai';

import * as ask from '../ask.js';

function verifyResponse(error, stdout, stderr) {
    const result = ask.verifyResult(error, stderr);
    const { alexaResponses } = result.alexaExecutionInfo;
    expect(alexaResponses.length, 'one response').to.equal(1);
    expect(alexaResponses[0].type, 'speech response').to.equal('Speech');
    expect(alexaResponses[0].content.caption, 'output speech').to.equal('Hier ist die Kamera Warnemünde Nordwest.');
}

describe('Wetterkamera Warnemünde', () => {
    it('should find webcam for Warnemünde', (done) => {
        const args = ask.execArgs.concat(['test/integration/warnemünde.json']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, stderr);
            done();
        });
    });

    it('should find webcam for Rostock', (done) => {
        const args = ask.execArgs.concat(['test/integration/rostock.json']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, stderr);
            done();
        });
    });

    it('should find webcam for Rostock Warnemünde', (done) => {
        const args = ask.execArgs.concat(['test/integration/rostock_warnemünde.json']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, stderr);
            done();
        });
    });
});
