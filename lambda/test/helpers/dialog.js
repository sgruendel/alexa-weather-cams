import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';

const execute = promisify(execFile);

export class SimulationError extends Error {
    constructor(message, retryReason) {
        super(message);
        this.name = 'SimulationError';
        this.retryReason = retryReason;
        this.retryable = Boolean(retryReason);
    }
}

/** Return every completed turn; retain the final poll for each simulation ID. */
export function parseDialogOutput(output, expectedTurns) {
    if (!output || !Array.isArray(output.invocations)) throw new SimulationError('Malformed simulation output');
    const completed = new Map();
    let transientError;
    for (const invocation of output.invocations) {
        const body = invocation.response?.body;
        if (!body || body.status === 'IN_PROGRESS') continue;
        // Validate before deduplicating: a later poll must never conceal an error.
        const error = body.result?.error;
        if (error) {
            const failure = new SimulationError(`Turn ${completed.size + 1}: ${error.message}`, error.message === 'An unexpected error occurred.' ? 'transient' : undefined);
            if (!failure.retryable) throw failure;
            transientError = failure;
            continue;
        }
        if (body.status !== 'SUCCESSFUL') throw new SimulationError(`Turn ${completed.size + 1}: simulation status ${body.status}`);
        const speech = body.result?.alexaExecutionInfo?.alexaResponses;
        if (!Array.isArray(speech) || !speech.some(response => response.type === 'Speech' && typeof response.content?.caption === 'string')) {
            throw new SimulationError(`Turn ${completed.size + 1}: missing Alexa speech`);
        }
        completed.set(body.id ?? Symbol(), body);
    }
    if (transientError) throw transientError;
    const turns = [...completed.values()];
    if (turns.length !== expectedTurns) {
        throw new SimulationError(`Expected ${expectedTurns} completed turns, received ${turns.length}`, 'incomplete');
    }
    return turns;
}

/** Run the development skill with bounded retries and a hard subprocess deadline. */
export async function runDialog(replayFile, {
    skillId,
    run = execute,
    totalTimeoutMs = 80000,
    attemptTimeoutMs = 35000,
    retryDelayMs = 1000,
    maxAttempts = 2,
    profile = 'default',
} = {}) {
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 2) throw new Error('maxAttempts must be 1 or 2');
    if (!skillId) throw new Error('SKILL_ID is required for deployed Alexa tests');
    const replay = JSON.parse(await readFile(replayFile, 'utf8'));
    if (!Array.isArray(replay.userInput) || replay.userInput.some(input => typeof input !== 'string')) {
        throw new Error('A replay must contain a userInput array of strings');
    }
    const expectedTurns = replay.userInput.filter(input => !input.startsWith('.')).length;
    if (!expectedTurns) throw new Error('A replay must contain at least one utterance');
    const directory = await mkdtemp(path.join(tmpdir(), 'alexa-weather-dialog-'));
    const inputFile = path.join(directory, 'replay.json');
    const outputFile = path.join(directory, 'output.json');
    const deadline = performance.now() + totalTimeoutMs;
    try {
        await writeFile(inputFile, JSON.stringify({ ...replay, skillId }));
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            const remaining = Math.floor(deadline - performance.now());
            if (remaining <= 0) throw new Error('ASK dialog deadline exceeded');
            await writeFile(outputFile, JSON.stringify({ invocations: [] }));
            let diagnostics;
            let processError;
            try {
                diagnostics = await run('ask', [
                    'dialog', '--locale', replay.locale ?? 'de-DE', '--stage', 'development',
                    '--profile', profile, '--replay', inputFile, '--save-skill-io', outputFile,
                ], { encoding: 'utf8', timeout: Math.min(attemptTimeoutMs, remaining), killSignal: 'SIGKILL', maxBuffer: 4 * 1024 * 1024 });
            } catch (error) {
                // A normal nonzero exit can represent a saved simulation failure.
                // Signals, timeouts, spawn failures and output limits remain fatal.
                if (error.killed || error.signal || !Number.isInteger(error.code) || error.code === 0) throw error;
                processError = error;
                diagnostics = error;
            }
            const { stdout, stderr } = diagnostics;
            try {
                const turns = parseDialogOutput(JSON.parse(await readFile(outputFile, 'utf8')), expectedTurns);
                if (processError) throw processError;
                return turns;
            } catch (error) {
                // A failed CLI invocation is retryable only when its saved output
                // positively identifies the known transient simulation error.
                if (processError && !(error instanceof SimulationError && error.retryReason === 'transient')) throw processError;
                if (processError) error.cause = processError;
                if (!(error instanceof SimulationError) || !error.retryable || attempt === maxAttempts) {
                    error.message += `\nASK diagnostics:\n${stderr ?? ''}${stdout ?? ''}`;
                    throw error;
                }
                if (deadline - performance.now() <= retryDelayMs) throw new Error('ASK dialog deadline exceeded', { cause: error });
                await delay(retryDelayMs);
            }
        }
        throw new Error('ASK dialog exhausted its attempts');
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
}
