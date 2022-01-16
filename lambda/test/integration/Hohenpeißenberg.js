'use strict';

const { execFile } = require('child_process');
const expect = require('chai').expect;

const ask = require('../ask');

function verifyResponse(error, stdout, outputSpeech) {
    const result = ask.verifyResult(error, stdout);
    const { alexaResponses } = result.alexaExecutionInfo;
    expect(alexaResponses.length, 'one response').to.equal(1);
    expect(alexaResponses[0].type, 'speech response').to.equal('Speech');
    expect(alexaResponses[0].content.caption, 'output speech').to.equal(outputSpeech);
}

describe('Wetterkamera Hohenpeißenberg', () => {
    it('should find webcams for Hohenpeißenberg', (done) => {
        const args = ask.execArgs.concat(['Alexa frage Wetterkamera nach Hohenpeißenberg']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, 'Welche Kamera, Hohenpeißenberg Süd oder Hohenpeißenberg Südwest?');
            done();
        });
    });

    it('should find webcam for Hohenpeißenberg Südwest', (done) => {
        const args = ask.execArgs.concat(['Alexa frage Wetterkamera nach Hohenpeißenberg Südwest']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, 'Hier ist die Kamera Hohenpeißenberg Südwest.');
            done();
        });
    });
});
