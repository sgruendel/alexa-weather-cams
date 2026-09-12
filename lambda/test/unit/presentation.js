import { expect } from 'chai';
import { handler } from '../../index.js';
import { intentRequest, resolvedSlot, continueSession } from '../helpers/alexa.js';

const webcam = resolvedSlot('webcam', 'Hamburg Südwest', [{ id: 'Hamburg-SW' }]);
describe('screen presentation and session continuity', () => {
    for (const supportedInterfaces of [{}, { Display: {} }, { 'Alexa.Presentation.APL': {} }, { Display: {}, 'Alexa.Presentation.APL': {} }]) {
        it(`renders capabilities ${JSON.stringify(supportedInterfaces)}`, async () => {
            const request = intentRequest('WeatherCamIntent', { webcam }, 'IN_PROGRESS', { supportedInterfaces });
            const before = structuredClone(request);
            const result = await handler(request, {});
            expect(request).to.deep.equal(before);
            expect(result.sessionAttributes.value.id).to.equal('Hamburg-SW');
            expect(result.response.card.title).to.equal('Hamburg Südwest');
            const directives = result.response.directives ?? [];
            if (Object.keys(supportedInterfaces).length === 0) {
                expect(directives).to.have.length(0);
                expect(result.response.shouldEndSession).to.equal(true);
                expect(() => continueSession(request, result)).to.throw('ended session');
                return;
            }
            expect(result.response).not.to.have.property('shouldEndSession');
            expect(directives).to.have.length(1);
            if (supportedInterfaces['Alexa.Presentation.APL']) {
                expect(directives[0]).to.include({ type: 'Alexa.Presentation.APL.RenderDocument', token: `camera-${request.request.requestId}` });
                expect(directives[0].document).to.include({ type: 'APL', version: '1.0' });
                expect(directives[0].datasources.camera).to.deep.equal({ name: 'Hamburg Südwest', attribution: 'Quelle: Deutscher Wetterdienst', url: 'https://opendata.dwd.de/weather/webcam/Hamburg-SW/Hamburg-SW_latest_816.jpg' });
                const items = directives[0].document.mainTemplate.items[0].items;
                expect(items[1]).to.include({ type: 'Image', scale: 'best-fit', source: '${camera.url}' });
                expect(items[0].text).to.equal('${camera.name}');
                expect(items[2].text).to.equal('${camera.attribution}');
            } else {
                expect(directives[0].template.title).to.equal('Hamburg Südwest');
                expect(directives[0].template.image.contentDescription).to.equal('Quelle: Deutscher Wetterdienst');
            }
            const nextRequest = intentRequest('AMAZON.NextIntent', {}, 'COMPLETED', continueSession(request, result));
            expect(nextRequest.session.sessionId).to.equal(request.session.sessionId);
            const next = await handler(nextRequest, {});
            expect(next.sessionAttributes.value.id).to.equal('Hohenpeissenberg-S');
            const previous = await handler(intentRequest('AMAZON.PreviousIntent', {}, 'COMPLETED', continueSession(nextRequest, next)), {});
            expect(previous.sessionAttributes.value.id).to.equal('Hamburg-SW');
            if (supportedInterfaces['Alexa.Presentation.APL']) expect(next.response.directives[0].token).not.to.equal(directives[0].token);
        });
    }
    for (const intent of ['AMAZON.NextIntent', 'AMAZON.PreviousIntent']) {
        it(`returns help for unknown state on ${intent}`, async () => {
            const result = await handler(intentRequest(intent, {}, 'COMPLETED', { attributes: { value: { id: 'unknown' } } }), {});
            expect(result.response.outputSpeech.ssml).to.contain('Welche Kamera soll ich anzeigen?');
            expect(result.response.card).to.equal(undefined);
        });
    }
    for (const intent of ['AMAZON.StopIntent', 'AMAZON.CancelIntent']) {
        it(`ends a screen session for ${intent}`, async () => {
            const request = intentRequest('WeatherCamIntent', { webcam }, 'COMPLETED', { supportedInterfaces: { 'Alexa.Presentation.APL': {} } });
            const first = await handler(request, {});
            const result = await handler(intentRequest(intent, {}, 'COMPLETED', continueSession(request, first)), {});
            expect(result.response.shouldEndSession).to.equal(true);
        });
    }
    it('re-elicits unusable resolution data without an exception', async () => {
        for (const slots of [{}, { webcam: { value: 'Hamburg' } }, { webcam: resolvedSlot('webcam', 'Hamburg', [], 'ER_ERROR_TIMEOUT') }]) {
            const result = await handler(intentRequest('WeatherCamIntent', slots), {});
            expect(result.response.directives[0]).to.include({ type: 'Dialog.ElicitSlot', slotToElicit: 'webcam' });
        }
    });
});
