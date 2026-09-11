import { expect } from 'chai';

import { handler } from '../../index.js';
import { intentRequest, launchRequest, resolvedSlot, sessionEndedRequest } from '../helpers/alexa.js';

const FALLBACK_MESSAGE = 'Dort gibt es leider keine DWD-Wetterkamera.'
    + ' Ich kann dir die Bilder von Hamburg, Hohenpeißenberg, Lindenberg, Offenbach, Schmücke, Warnemünde'
    + ' und der Wasserkuppe zeigen. Welche Kamera soll ich anzeigen?';
const HELP_MESSAGE = 'Ich kann dir die Bilder von den DWD-Wetterkameras in Hamburg, Hohenpeißenberg, Lindenberg,'
    + ' Offenbach, Schmücke, Warnemünde und auf der Wasserkuppe zeigen. Welche Kamera soll ich anzeigen?';
const HELP_REPROMPT = 'Welche DWD-Wetterkamera soll ich anzeigen,'
    + ' Hamburg, Hohenpeißenberg, Lindenberg, Offenbach, Schmücke, Warnemünde oder Wasserkuppe?';
const STOP_MESSAGE = 'bis dann';

function speech(responseEnvelope) {
    return responseEnvelope.response.outputSpeech.ssml;
}

function expectWebcamResponse(result, name, id) {
    expect(speech(result)).to.contain(`Hier ist die Kamera ${name}.`);
    expect(result.response.card).to.include({ type: 'Standard', title: name });
    expect(result.response.card.text, 'card text').to.have.string('Quelle: Deutscher Wetterdienst');
    expect(result.response.card.image, 'card image').to.deep.equal({
        smallImageUrl: `https://opendata.dwd.de/weather/webcam/${id}/${id}_latest_114.jpg`,
        largeImageUrl: `https://opendata.dwd.de/weather/webcam/${id}/${id}_latest_180.jpg`,
    });
    expect(result.response).to.not.have.property('reprompt');
    expect(result.response.shouldEndSession).to.equal(true);
}

describe('Wetterkamera Skill', () => {

    it('uses the error handler for unsupported intents', async () => {
        const result = await handler(intentRequest('UnsupportedIntent'), {});

        expect(speech(result)).to.contain('Entschuldigung, das verstehe ich nicht. Bitte wiederhole das?');
        expect(result.response.reprompt.outputSpeech.ssml)
            .to.contain('Entschuldigung, das verstehe ich nicht. Bitte wiederhole das?');
        expect(result.response.shouldEndSession).to.equal(false);
    });

    it('handles the fallback intent', async () => {
        const result = await handler(intentRequest('AMAZON.FallbackIntent'), {});

        expect(speech(result)).to.contain(FALLBACK_MESSAGE);
        expect(result.response.reprompt.outputSpeech.ssml).to.contain(HELP_REPROMPT);
        expect(result.response.shouldEndSession).to.equal(false);
    });

    it('handles the help intent', async () => {
        const result = await handler(intentRequest('AMAZON.HelpIntent'), {});

        expect(speech(result)).to.contain(HELP_MESSAGE);
        expect(result.response.reprompt.outputSpeech.ssml).to.contain(HELP_REPROMPT);
        expect(result.response.shouldEndSession).to.equal(false);
    });

    it('shows the help message for the previous intent without a webcam', async () => {
        const result = await handler(intentRequest('AMAZON.PreviousIntent'), {});

        expect(speech(result)).to.contain(HELP_MESSAGE);
        expect(result.response.reprompt.outputSpeech.ssml).to.contain(HELP_REPROMPT);
        expect(result.response.shouldEndSession).to.equal(false);
    });

    it('shows the previous webcam for Hamburg Südost', async () => {
        const webcam = resolvedSlot('webcam', 'Hamburg Südost', [{ name: 'Hamburg Südost', id: 'Hamburg-SO' }]);

        const first = await handler(intentRequest('WeatherCamIntent', { webcam }), {});
        expectWebcamResponse(first, 'Hamburg Südost', 'Hamburg-SO');

        const result = await handler(
            intentRequest('AMAZON.PreviousIntent', {}, 'COMPLETED', {
                sessionNew: false,
                attributes: first.sessionAttributes,
            }),
            {},
        );
        expectWebcamResponse(result, 'Wasserkuppe Südwest', 'Wasserkuppe-SW');
    });

    it('shows the previous webcam for Warnemünde Nordwest', async () => {
        const webcam = resolvedSlot(
            'webcam', 'Warnemünde Nordwest', [{ name: 'Warnemünde Nordwest', id: 'Warnemuende-NW' }]);

        const first = await handler(intentRequest('WeatherCamIntent', { webcam }), {});
        expectWebcamResponse(first, 'Warnemünde Nordwest', 'Warnemuende-NW');

        const result = await handler(
            intentRequest('AMAZON.PreviousIntent', {}, 'COMPLETED', {
                sessionNew: false,
                attributes: first.sessionAttributes,
            }),
            {},
        );
        expectWebcamResponse(result, 'Schmücke Südwest', 'Schmuecke-SW');
    });

    it('shows the help message for the next intent without a webcam', async () => {
        const result = await handler(intentRequest('AMAZON.NextIntent'), {});

        expect(speech(result)).to.contain(HELP_MESSAGE);
        expect(result.response.reprompt.outputSpeech.ssml).to.contain(HELP_REPROMPT);
        expect(result.response.shouldEndSession).to.equal(false);
    });

    it('shows the next webcam for Hamburg Südost', async () => {
        const webcam = resolvedSlot('webcam', 'Hamburg Südost', [{ name: 'Hamburg Südost', id: 'Hamburg-SO' }]);

        const first = await handler(intentRequest('WeatherCamIntent', { webcam }), {});
        expectWebcamResponse(first, 'Hamburg Südost', 'Hamburg-SO');

        const result = await handler(
            intentRequest('AMAZON.NextIntent', {}, 'COMPLETED', {
                sessionNew: false,
                attributes: first.sessionAttributes,
            }),
            {},
        );
        expectWebcamResponse(result, 'Hamburg Südwest', 'Hamburg-SW');
    });

    it('shows the next webcam for Wasserkuppe Südwest', async () => {
        const webcam = resolvedSlot(
            'webcam', 'Wasserkuppe Südwest', [{ name: 'Wasserkuppe Südwest', id: 'Wasserkuppe-SW' }]);

        const first = await handler(intentRequest('WeatherCamIntent', { webcam }), {});
        expectWebcamResponse(first, 'Wasserkuppe Südwest', 'Wasserkuppe-SW');

        const result = await handler(
            intentRequest('AMAZON.NextIntent', {}, 'COMPLETED', {
                sessionNew: false,
                attributes: first.sessionAttributes,
            }),
            {},
        );
        expectWebcamResponse(result, 'Hamburg Südost', 'Hamburg-SO');
    });

    it('handles the cancel intent', async () => {
        const result = await handler(intentRequest('AMAZON.CancelIntent'), {});

        expect(speech(result)).to.contain(STOP_MESSAGE);
        expect(result.response).to.not.have.property('reprompt');
        expect(result.response.shouldEndSession).to.equal(true);
    });

    it('handles the stop intent', async () => {
        const result = await handler(intentRequest('AMAZON.StopIntent'), {});

        expect(speech(result)).to.contain(STOP_MESSAGE);
        expect(result.response).to.not.have.property('reprompt');
        expect(result.response.shouldEndSession).to.equal(true);
    });

    it('handles a session-ended request', async () => {
        const result = await handler(sessionEndedRequest(), {});

        expect(result.response).to.not.have.property('outputSpeech');
        expect(result.response).to.not.have.property('reprompt');
        expect(result.response.shouldEndSession).to.equal(true);
    });

    it('handles a session-ended request with an error', async () => {
        const result = await handler(sessionEndedRequest('ERROR'), {});

        expect(result.response).to.not.have.property('outputSpeech');
        expect(result.response).to.not.have.property('reprompt');
        expect(result.response.shouldEndSession).to.equal(true);
    });

    it('handles a launch request', async () => {
        const result = await handler(launchRequest(), {});

        expect(speech(result)).to.contain('Welche Kamera soll ich anzeigen?');
        expect(result.response.reprompt.outputSpeech.ssml).to.contain(HELP_REPROMPT);
        expect(result.response.shouldEndSession).to.equal(false);
    });

    it('shows a webcam for a resolved webcam slot', async () => {
        const webcam = resolvedSlot('webcam', 'Hamburg elbabwärts', [{ name: 'Hamburg Südwest', id: 'Hamburg-SW' }]);

        const result = await handler(intentRequest('WeatherCamIntent', { webcam }), {});

        expectWebcamResponse(result, 'Hamburg Südwest', 'Hamburg-SW');
    });

    it('reports an unknown webcam', async () => {
        const webcam = resolvedSlot('webcam', 'Würzburg', [], 'ER_SUCCESS_NO_MATCH');

        const result = await handler(intentRequest('WeatherCamIntent', { webcam }), {});

        expect(speech(result)).to.contain('Ich kenne diese Kamera leider nicht.');
        expect(result.response).to.not.have.property('reprompt');
        expect(result.response.shouldEndSession).to.equal(true);
    });

    it('elicits a webcam when Alexa resolves multiple matches', async () => {
        const webcam = resolvedSlot('webcam', 'Offenbach', [
            { name: 'Offenbach Ost', id: 'Offenbach-O' },
            { name: 'Offenbach West', id: 'Offenbach-W' },
        ]);

        const result = await handler(intentRequest('WeatherCamIntent', { webcam }), {});

        expect(speech(result)).to.contain('Welche Kamera, Offenbach Ost oder Offenbach West?');
        expect(result.response.reprompt.outputSpeech.ssml)
            .to.contain('Welche Kamera, Offenbach Ost oder Offenbach West?');
        expect(result.response.directives[0]).to.include({ type: 'Dialog.ElicitSlot', slotToElicit: 'webcam' });
        expect(result.sessionAttributes.names, 'names').to.deep.equal(['Offenbach Ost', 'Offenbach West']);
        expect(result.response.shouldEndSession).to.equal(false);
    });

    it('uses the webcam matching a previous answer option', async () => {
        const hamburg = resolvedSlot('webcam', 'Hamburg', [
            { name: 'Hamburg Südost', id: 'Hamburg-SO' },
            { name: 'Hamburg Südwest', id: 'Hamburg-SW' },
        ]);

        const first = await handler(intentRequest('WeatherCamIntent', { webcam: hamburg }), {});
        expect(speech(first)).to.contain('Welche Kamera, Hamburg Südost oder Hamburg Südwest?');
        expect(first.response.directives[0]).to.include({ type: 'Dialog.ElicitSlot', slotToElicit: 'webcam' });
        expect(first.sessionAttributes.names, 'names').to.deep.equal(['Hamburg Südost', 'Hamburg Südwest']);
        expect(first.response.shouldEndSession).to.equal(false);

        const suedwest = resolvedSlot('webcam', 'Südwest', [
            { name: 'Hamburg Südwest', id: 'Hamburg-SW' },
            { name: 'Schmücke Südwest', id: 'Schmuecke-SW' },
            { name: 'Hohenpeißenberg Südwest', id: 'Hohenpeissenberg-SW' },
        ]);

        const result = await handler(
            intentRequest('WeatherCamIntent', { webcam: suedwest }, 'COMPLETED', {
                sessionNew: false,
                attributes: first.sessionAttributes,
            }),
            {},
        );
        expectWebcamResponse(result, 'Hamburg Südwest', 'Hamburg-SW');
    });
});
