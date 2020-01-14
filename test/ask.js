'use strict';

const expect = require('chai').expect;

var exports = module.exports = {};

exports.execFile = 'ask';
exports.execArgs = [ 'simulate', '-s', 'amzn1.ask.skill.6896cced-41a6-4134-912d-c74db2be8559', '-l', 'de-DE', '--stage', 'live', /* '--force-new-session', */ '-t' ];

exports.verifyResult = (error, stdout) => {
    // console.log('stdout', stdout);
    expect(error).to.be.null;
    const jsonStart = stdout.indexOf('{');
    if (jsonStart < 0) {
        // console.error('json start not found', stdout);
        expect(jsonStart).to.be.greaterThan(0);
    }
    const { result } = JSON.parse(stdout.substr(jsonStart));
    if (result.error) {
        // console.error('error message in json', result.error);
        expect(result.error, result.error.message).to.be.null;
    }
    return result;
};
