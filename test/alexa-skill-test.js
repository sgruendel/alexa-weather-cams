'use strict';

// include the testing framework
const alexaTest = require('alexa-skill-test-framework');

// custom slot types
const LIST_OF_WEBCAMS = 'LIST_OF_WEBCAMS';

// initialize the testing framework
alexaTest.initialize(
    require('../src/index'),
    'amzn1.ask.skill.6896cced-41a6-4134-912d-c74db2be8559',
    'amzn1.ask.account.VOID');
alexaTest.setLocale('de-DE');

describe('Wetter Kamera Skill', () => {
    describe('LaunchRequest', () => {
        alexaTest.test([
            {
                request: alexaTest.getLaunchRequest(),
                says: 'Du kannst sagen „Frage Wetter Kamera nach Hamburg elbabwärts“, oder du kannst „Beenden“ sagen. Was soll ich tun?',
                reprompts: 'Was soll ich tun?',
                shouldEndSession: false,
            },
        ]);
    });

    describe('HelpIntent', () => {
        alexaTest.test([
            {
                request: alexaTest.getIntentRequest('AMAZON.HelpIntent'),
                says: 'Du kannst sagen „Frage Wetter Kamera nach Hamburg elbabwärts“, oder du kannst „Beenden“ sagen. Was soll ich tun?',
                reprompts: 'Was soll ich tun?',
                shouldEndSession: false,
            },
        ]);
    });

    describe('CancelIntent', () => {
        alexaTest.test([
            {
                request: alexaTest.getIntentRequest('AMAZON.CancelIntent'),
                says: '<say-as interpret-as="interjection">bis dann</say-as>.',
                repromptsNothing: true, shouldEndSession: true,
            },
        ]);
    });

    describe('StopIntent', () => {
        alexaTest.test([
            {
                request: alexaTest.getIntentRequest('AMAZON.StopIntent'),
                says: '<say-as interpret-as="interjection">bis dann</say-as>.',
                repromptsNothing: true, shouldEndSession: true,
            },
        ]);
    });

    describe('SessionEndedRequest', () => {
        alexaTest.test([
            {
                request: alexaTest.getSessionEndedRequest(),
                saysNothing: true, repromptsNothing: true, shouldEndSession: true,
            },
        ]);
    });

    describe('ErrorHandler', () => {
        alexaTest.test([
            {
                request: alexaTest.getIntentRequest(''),
                says: 'Entschuldigung, das verstehe ich nicht. Bitte wiederhole das?',
                reprompts: 'Entschuldigung, das verstehe ich nicht. Bitte wiederhole das?',
                shouldEndSession: false,
            },
        ]);
    });

    describe('WeatherCamIntent', () => {
        alexaTest.test([
            {
                request: alexaTest.addEntityResolutionToRequest(
                    alexaTest.getIntentRequest('WeatherCamIntent', { webcam: 'Hamburg elbabwärts' }),
                    'webcam', LIST_OF_WEBCAMS, 'Hamburg Südwest', 'Hamburg-SW'),
                says: 'Hier ist die Kamera Hamburg Südwest.',
                hasCardTitle: 'Hamburg Südwest',
                hasCardTextLike: 'Quelle: Deutscher Wetterdienst',
                hasSmallImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Hamburg-SW/Hamburg-SW_latest_114.jpg',
                hasLargeImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Hamburg-SW/Hamburg-SW_latest_180.jpg',
                repromptsNothing: true, shouldEndSession: true,
            },
            {
                request: alexaTest.addEntityResolutionsToRequest(
                    alexaTest.getIntentRequest('WeatherCamIntent', { webcam: 'Offenbach' }),
                    [
                        { slotName: 'webcam', slotType: LIST_OF_WEBCAMS, value: 'Offenbach Ost', id: 'Offenbach-O' },
                        { slotName: 'webcam', slotType: LIST_OF_WEBCAMS, value: 'Offenbach West', id: 'Offenbach-W' },
                    ]),
                elicitsSlot: 'webcam',
                says: 'Welche Kamera, Offenbach Ost oder Offenbach West?',
                reprompts: 'Welche Kamera, Offenbach Ost oder Offenbach West?',
                shouldEndSession: false,
            },
            {
                request: alexaTest.addEntityResolutionNoMatchToRequest(
                    alexaTest.getIntentRequest('WeatherCamIntent'), 'webcam', LIST_OF_WEBCAMS, 'Würzburg'),
                says: 'Ich kenne diese Kamera leider nicht.',
                shouldEndSession: true,
            },
        ]);
    });
});
