import { execFile } from 'child_process';
import { expect } from 'chai';

import * as ask from '../ask.js';

function verifyResponse(error, stdout, stderr, expectFn) {
    const result = ask.verifyResult(error, stderr);
    // console.log('alexa responses', result.alexaExecutionInfo.alexaResponses);
    // console.log('considered intents', result.alexaExecutionInfo.consideredIntents);
    // console.log('invocations', result.skillExecutionInfo.invocations);
    const { alexaResponses } = result.alexaExecutionInfo;
    expect(alexaResponses.length, 'one response').to.equal(1);
    expect(alexaResponses[0].type, 'speech response').to.equal('Speech');
    expectFn(alexaResponses[0].content.caption, 'output speech');
}

describe('Wetterkamera Hamburg', () => {
    it('should find webcams for Hamburg', (done) => {
        const args = ask.execArgs.concat(['test/integration/hamburg.json']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, stderr,
                (val, msg) => expect(val, msg).to.eq('Welche Kamera, Hamburg Südost oder Hamburg Südwest?'));
            done();
        });
    });

    it('should find webcam for Hamburg elbaufwärts', (done) => {
        const args = ask.execArgs.concat(['test/integration/hamburg_elbaufwärts.json']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, stderr,
                (val, msg) => expect(val, msg).to.eq('Hier ist die Kamera Hamburg Südost.'));
            done();
        });
    });

    it('should find webcam for Hamburg elbabwärts', (done) => {
        const args = ask.execArgs.concat(['test/integration/hamburg_elbabwärts.json']);
        execFile(ask.execFile, args, (error, stdout, stderr) => {
            verifyResponse(error, stdout, stderr,
                (val, msg) => expect(val, msg).to.eq('Hier ist die Kamera Hamburg Südwest.'));
            done();
        });
    });
});
