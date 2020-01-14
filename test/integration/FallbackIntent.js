'use strict';

const { execFile } = require('child_process');
const expect = require('chai').expect;

const ask = require('../ask');

function verifyResponse(error, stdout, outputSpeech) {
    const result = ask.verifyResult(error, stdout);
    const { alexaResponses } = result.alexaExecutionInfo;
    expect(alexaResponses.length, 'one response').to.equal(1);
    expect(alexaResponses[0].type, 'speech response').to.equal('Speech');
    expect(alexaResponses[0].content.caption, 'output speech').to.have.string(outputSpeech);
}

describe('FallbackIntent', () => {
    it('should find no webcam for Berlin', (done) => {
        const args = ask.execArgs.concat(['Alexa frage Wetterkamera nach Berlin']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, 'Dort gibt es leider keine DWD-Wetterkamera.');
            done();
        });
    });
});
