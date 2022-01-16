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

describe('Wetterkamera Offenbach', () => {
    it('should find webcams for Offenbach', (done) => {
        const args = ask.execArgs.concat(['Alexa frage Wetterkamera nach Offenbach']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, 'Welche Kamera, Offenbach Ost oder Offenbach West?');
            done();
        });
    });

    it('should find webcam for Offenbach Ost', (done) => {
        const args = ask.execArgs.concat(['Alexa frage Wetterkamera nach Offenbach Ost']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, 'Hier ist die Kamera Offenbach Ost.');
            done();
        });
    });

    it('should find webcam for Offenbach West', (done) => {
        const args = ask.execArgs.concat(['Alexa frage Wetterkamera nach Offenbach West']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, 'Hier ist die Kamera Offenbach West.');
            done();
        });
    });
});
