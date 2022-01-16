'use strict';

const { execFile } = require('child_process');
const expect = require('chai').expect;

const ask = require('../ask');

function verifyResponse(error, stdout) {
    const result = ask.verifyResult(error, stdout);
    const { alexaResponses } = result.alexaExecutionInfo;
    expect(alexaResponses.length, 'one response').to.equal(1);
    expect(alexaResponses[0].type, 'speech response').to.equal('Speech');
    expect(alexaResponses[0].content.caption, 'output speech').to.equal('Hier ist die Kamera Wasserkuppe Südwest.');
}

describe('Wetterkamera Wasserkuppe', () => {
    it('should find webcam', (done) => {
        const args = ask.execArgs.concat(['Alexa frage Wetterkamera nach Wasserkuppe']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout);
            done();
        });
    });
});
