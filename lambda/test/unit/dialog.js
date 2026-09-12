import { expect } from 'chai';
import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { parseDialogOutput, runDialog } from '../helpers/dialog.js';
import { verifyTurns } from '../ask.js';

const successfulTurn = (caption = 'OK') => ({
    status: 'SUCCESSFUL',
    result: {
        alexaExecutionInfo: { alexaResponses: [{ type: 'Speech', content: { caption } }] },
        skillExecutionInfo: { invocations: [{
            invocationRequest: { body: { request: { type: 'IntentRequest', intent: { name: 'WeatherCamIntent' } } } },
            invocationResponse: { body: { response: { shouldEndSession: false, directives: [{ type: 'Dialog.ElicitSlot', slotToElicit: 'webcam' }] } } },
        }] },
    },
});
const output = (...turns) => ({ invocations: turns.map(body => ({ response: { body } })) });

async function rejection(promise) {
    try { await promise; } catch (error) { return error; }
    throw new Error('Expected rejection');
}

describe('dialog runner', () => {
    let directory;
    let replayFile;
    let tempInput;
    beforeEach(async () => {
        directory = await mkdtemp(path.join(tmpdir(), 'alexa-dialog-test-'));
        replayFile = path.join(directory, 'replay.json');
        await writeFile(replayFile, JSON.stringify({ locale: 'de-DE', userInput: ['hello', 'webcam', '.quit'] }));
    });
    afterEach(async () => {
        await rm(directory, { recursive: true, force: true });
        if (tempInput) expect((await rejection(access(tempInput))).code).to.equal('ENOENT');
        tempInput = undefined;
    });
    const fakeRun = (responses, inspect = () => {}) => async (command, args, options) => {
        tempInput = args[args.indexOf('--replay') + 1];
        inspect(command, args, options);
        const replay = JSON.parse(await readFile(tempInput, 'utf8'));
        expect(replay.skillId).to.equal('test-skill');
        await writeFile(args[args.indexOf('--save-skill-io') + 1], JSON.stringify(responses));
        return { stdout: '', stderr: '' };
    };

    it('retains and validates every completed turn', async () => {
        const turns = await runDialog(replayFile, { skillId: 'test-skill', run: fakeRun(output(successfulTurn('First'), successfulTurn('Last')), (command, args, options) => {
            expect(command).to.equal('ask');
            expect(args[args.indexOf('--stage') + 1]).to.equal('development');
            expect(options.timeout).to.equal(35000);
            expect(options.killSignal).to.equal('SIGKILL');
        }) });
        verifyTurns(turns, [{ speech: 'First', elicit: 'webcam' }, { speech: 'Last', elicit: 'webcam' }]);
        expect(() => verifyTurns(turns, [{ speech: 'Wrong' }, { speech: 'Last' }])).to.throw();
    });
    it('fails an earlier error even when the final turn succeeds', async () => {
        let attempts = 0;
        const run = fakeRun(output({ status: 'FAILED', result: { error: { message: 'Invalid directive' } } }, successfulTurn()));
        const error = await rejection(runDialog(replayFile, { skillId: 'test-skill', run: (...args) => { attempts++; return run(...args); } }));
        expect(error.message).to.contain('Turn 1: Invalid directive');
        expect(attempts).to.equal(1);
    });
    it('deduplicates repeated polls by simulation ID', () => {
        const turn = { ...successfulTurn(), id: 'one' };
        expect(parseDialogOutput(output({ id: 'one', status: 'IN_PROGRESS' }, turn, turn), 1)).to.have.length(1);
    });
    it('retries incomplete output, then returns all turns', async () => {
        let attempts = 0;
        const turns = await runDialog(replayFile, { skillId: 'test-skill', retryDelayMs: 1, run: (...args) => {
            attempts++;
            return fakeRun(attempts === 1 ? output(successfulTurn()) : output(successfulTurn(), successfulTurn()))(...args);
        } });
        expect(attempts).to.equal(2);
        expect(turns).to.have.length(2);
    });
    it('bounds retries of the known transient simulation error', async () => {
        let attempts = 0;
        const run = fakeRun(output({ status: 'FAILED', result: { error: { message: 'An unexpected error occurred.' } } }));
        const error = await rejection(runDialog(replayFile, { skillId: 'test-skill', retryDelayMs: 1, run: (...args) => { attempts++; return run(...args); } }));
        expect(attempts).to.equal(2);
        expect(error.message).to.contain('unexpected error');
    });
    it('does not retry missing speech or malformed JSON', async () => {
        expect(() => parseDialogOutput(output({ status: 'SUCCESSFUL', result: {} }), 1)).to.throw('missing Alexa speech');
        let attempts = 0;
        const error = await rejection(runDialog(replayFile, { skillId: 'test-skill', run: async (command, args) => {
            attempts++;
            tempInput = args[args.indexOf('--replay') + 1];
            await writeFile(args[args.indexOf('--save-skill-io') + 1], '{');
            return {};
        } }));
        expect(error).to.be.instanceOf(SyntaxError);
        expect(attempts).to.equal(1);
    });
    it('kills a stalled subprocess and cleans up its replay files', async () => {
        let attempts = 0;
        const error = await rejection(runDialog(replayFile, { skillId: 'test-skill', attemptTimeoutMs: 50,
            run: (command, args, options) => {
                attempts++;
                tempInput = args[args.indexOf('--replay') + 1];
                return promisify(execFile)(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], options);
            },
        }));
        expect(error.killed).to.equal(true);
        expect(error.signal).to.equal('SIGKILL');
        expect(attempts).to.equal(1);
    });
    it('rejects missing configuration before launching ASK', async () => {
        expect((await rejection(runDialog(replayFile))).message).to.contain('SKILL_ID');
    });
    it('isolates concurrent replay and output files and preserves source replays', async () => {
        const paths = [];
        const original = await readFile(replayFile, 'utf8');
        const run = async (command, args) => {
            const input = args[args.indexOf('--replay') + 1];
            const outputFile = args[args.indexOf('--save-skill-io') + 1];
            paths.push(input, outputFile);
            await writeFile(outputFile, JSON.stringify(output(successfulTurn(), successfulTurn())));
            return {};
        };
        await Promise.all([runDialog(replayFile, { skillId: 'test', run }), runDialog(replayFile, { skillId: 'test', run })]);
        expect(new Set(paths).size).to.equal(4);
        for (const file of paths) expect((await rejection(access(file))).code).to.equal('ENOENT');
        expect(await readFile(replayFile, 'utf8')).to.equal(original);
    });
    it('does not retry CLI errors', async () => {
        let attempts = 0;
        const error = await rejection(runDialog(replayFile, { skillId: 'test', run: async (command, args) => {
            attempts++;
            tempInput = args[args.indexOf('--replay') + 1];
            throw new Error('CLI failed');
        } }));
        expect(error.message).to.equal('CLI failed');
        expect(attempts).to.equal(1);
    });
    it('bounds incomplete output to two attempts', async () => {
        let attempts = 0;
        const error = await rejection(runDialog(replayFile, { skillId: 'test-skill', retryDelayMs: 1, run: (...args) => {
            attempts++;
            return fakeRun(output(successfulTurn()))(...args);
        } }));
        expect(attempts).to.equal(2);
        expect(error.message).to.contain('Expected 2 completed turns');
    });
    it('honors the total deadline before launching and before retries', async () => {
        expect((await rejection(runDialog(replayFile, { skillId: 'test', totalTimeoutMs: 0 }))).message).to.contain('deadline');
        const error = await rejection(runDialog(replayFile, { skillId: 'test-skill', totalTimeoutMs: 100, retryDelayMs: 100,
            run: fakeRun(output(), (command, args, options) => expect(options.timeout).to.be.at.most(100)),
        }));
        expect(error.message).to.contain('deadline');
    });
    it('rejects invalid replay data and attempt limits', async () => {
        expect((await rejection(runDialog(replayFile, { skillId: 'test', maxAttempts: 3 }))).message).to.contain('maxAttempts');
        for (const userInput of [[], ['.quit'], null, [42]]) {
            await writeFile(replayFile, JSON.stringify({ userInput }));
            expect((await rejection(runDialog(replayFile, { skillId: 'test' }))).message).to.contain('replay');
        }
    });
    it('rejects malformed output and failed statuses', () => {
        for (const value of [null, {}, { invocations: {} }]) expect(() => parseDialogOutput(value, 1)).to.throw('Malformed');
        expect(() => parseDialogOutput(output({ status: 'FAILED' }), 1)).to.throw('simulation status FAILED');
        const failed = { id: 'one', status: 'FAILED', result: { error: { message: 'bad' } } };
        expect(() => parseDialogOutput(output(failed, { ...successfulTurn(), id: 'one' }), 1)).to.throw('bad');
    });

    it('does not retry an arbitrary skill failure following a transient failure', async () => {
        let attempts = 0;
        const run = fakeRun(output(
            { status: 'FAILED', result: { error: { message: 'An unexpected error occurred.' } } },
            { status: 'FAILED', result: { error: { message: 'Invalid directive' } } },
        ));
        const error = await rejection(runDialog(replayFile, { skillId: 'test-skill', run: (...args) => { attempts++; return run(...args); } }));
        expect(error.message).to.contain('Invalid directive');
        expect(attempts).to.equal(1);
    });
    it('validates camera, help, fallback and navigation expectations and rejects ended sessions', () => {
        const makeTurn = (intent, response, session, caption = 'OK') => {
            const turn = successfulTurn(caption);
            const invocation = turn.result.skillExecutionInfo.invocations[0];
            invocation.invocationRequest.body = { request: { type: 'IntentRequest', intent: { name: intent } }, session };
            invocation.invocationResponse.body.response = response;
            return turn;
        };
        const cameraResponse = { card: { title: 'Hamburg Südwest' }, directives: [{ type: 'Alexa.Presentation.APL.RenderDocument' }] };
        const first = makeTurn('WeatherCamIntent', cameraResponse, { sessionId: 'same', new: true });
        const next = makeTurn('AMAZON.NextIntent', cameraResponse, { sessionId: 'same', new: false });
        const expectations = [
            { camera: 'Hamburg Südwest', intent: 'WeatherCamIntent', screen: true },
            { camera: 'Hamburg Südwest', intent: 'AMAZON.NextIntent', screen: true, continueSession: true },
        ];
        verifyTurns([first, next], expectations);
        for (const intent of ['AMAZON.HelpIntent', 'AMAZON.FallbackIntent']) {
            verifyTurns([makeTurn(intent, { shouldEndSession: false }, {}, 'Help')], [{ intent, speechIncludes: 'Help', endSession: false }]);
        }
        const ended = structuredClone(first);
        ended.result.skillExecutionInfo.invocations[0].invocationResponse.body.response.shouldEndSession = true;
        expect(() => verifyTurns([ended, next], [{ camera: 'Hamburg Südwest' }, expectations[1]])).to.throw('preceding session stays open');
        const wrongSession = structuredClone(next);
        wrongSession.result.skillExecutionInfo.invocations[0].invocationRequest.body.session.sessionId = 'different';
        expect(() => verifyTurns([first, wrongSession], expectations)).to.throw();
        expect(() => verifyTurns([first], [{ camera: 'Offenbach Ost' }])).to.throw();
        expect(() => verifyTurns([first], [{ intent: 'AMAZON.HelpIntent' }])).to.throw();
    });

});
