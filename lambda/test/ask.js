import { expect } from 'chai';
import { runDialog } from './helpers/dialog.js';

/** Assert every turn, including the actual skill response and session continuity. */
export function verifyTurns(turns, expectations) {
    expect(turns, 'dialog turns').to.have.length(expectations.length);
    let previous;
    for (const [index, expected] of expectations.entries()) {
        const result = turns[index].result;
        const caption = result.alexaExecutionInfo.alexaResponses
            .filter(response => response.type === 'Speech').map(response => response.content.caption.trim()).join(' ');
        if (expected.speech) expect(caption, `turn ${index + 1} speech`).to.equal(expected.speech);
        if (expected.speechIncludes) expect(caption, `turn ${index + 1} speech`).to.contain(expected.speechIncludes);
        const invocations = result.skillExecutionInfo?.invocations ?? [];
        const invocation = invocations.filter(entry => ['IntentRequest', 'LaunchRequest'].includes(entry.invocationRequest?.body?.request?.type)).at(-1);
        expect(invocation, `turn ${index + 1} skill invocation`).to.exist;
        const envelope = invocation.invocationRequest.body;
        const request = envelope.request;
        const response = invocation.invocationResponse?.body?.response;
        expect(response, `turn ${index + 1} skill response`).to.exist;
        if (expected.intent) expect(request.intent?.name).to.equal(expected.intent);
        if (expected.continueSession) {
            expect(previous, 'preceding turn').to.exist;
            expect(previous.response.shouldEndSession, 'preceding session stays open').not.to.equal(true);
            expect(envelope.session?.new).to.equal(false);
            expect(envelope.session.sessionId).to.equal(previous.session.sessionId);
        }
        const directives = response.directives ?? [];
        if (expected.elicit) {
            expect(directives.some(d => d.type === 'Dialog.ElicitSlot' && d.slotToElicit === expected.elicit)).to.equal(true);
            expect(response.shouldEndSession).to.equal(false);
        }
        if (expected.camera) {
            expect(response.card?.title).to.equal(expected.camera);
            expect(directives.some(d => d.type.startsWith('Dialog.'))).to.equal(false);
        }
        if (expected.screen) {
            expect(directives.some(d => ['Alexa.Presentation.APL.RenderDocument', 'Display.RenderTemplate'].includes(d.type))).to.equal(true);
            expect(response).not.to.have.property('shouldEndSession');
        }
        if (expected.endSession !== undefined) expect(response.shouldEndSession).to.equal(expected.endSession);
        previous = { response, session: envelope.session };
    }
}

export async function verifyDialog(replayFile, expectations) {
    const turns = await runDialog(replayFile, { skillId: process.env.SKILL_ID, profile: process.env.ASK_PROFILE ?? 'default' });
    verifyTurns(turns, expectations);
}
