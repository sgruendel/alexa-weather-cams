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

describe('Wetterkamera Hamburg', () => {
    it('should find webcams for Hamburg', (done) => {
        const args = ask.execArgs.concat(['Alexa frage Wetterkamera nach Hamburg']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, 'Welche Kamera, Hamburg Südost oder Hamburg Südwest?');
            done();
        });
    });

    it('should find webcam for Hamburg elbaufwärts', (done) => {
        const args = ask.execArgs.concat(['Alexa frage Wetterkamera nach Hamburg elbaufwärts']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, 'Hier ist die Kamera Hamburg Südost.');
            done();
        });
    });

    it('should find webcam for Hamburg elbabwärts', (done) => {
        const args = ask.execArgs.concat(['Alexa frage Wetterkamera nach Hamburg elbabwärts']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, 'Hier ist die Kamera Hamburg Südwest.');
            done();
        });
    });
});
