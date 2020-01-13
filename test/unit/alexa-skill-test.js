'use strict';

// include the testing framework
const alexaTest = require('alexa-skill-test-framework');

// custom slot types
const LIST_OF_WEBCAMS = 'LIST_OF_WEBCAMS';

// initialize the testing framework
alexaTest.initialize(
    require('../../src/index'),
    'amzn1.ask.skill.6896cced-41a6-4134-912d-c74db2be8559',
    'amzn1.ask.account.VOID');
alexaTest.setLocale('de-DE');

describe('Wetterkamera Skill', () => {

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

    describe('FallbackIntent', () => {
        alexaTest.test([
            {
                request: alexaTest.getIntentRequest('AMAZON.FallbackIntent'),
                says: 'Dort gibt es leider keine DWD-Wetterkamera. Ich kann dir die Bilder von Hamburg, Hohenpeißenberg, Lindenberg, Offenbach, Schmücke, Warnemünde und der Wasserkuppe zeigen. Welche Kamera soll ich anzeigen?',
                reprompts: 'Welche DWD-Wetterkamera soll ich anzeigen, Hamburg, Hohenpeißenberg, Lindenberg, Offenbach, Schmücke, Warnemünde oder Wasserkuppe?',
                shouldEndSession: false,
            },
        ]);
    });

    describe('HelpIntent', () => {
        alexaTest.test([
            {
                request: alexaTest.getIntentRequest('AMAZON.HelpIntent'),
                says: 'Ich kann dir die Bilder von den DWD-Wetterkameras in Hamburg, Hohenpeißenberg, Lindenberg, Offenbach, Schmücke, Warnemünde und auf der Wasserkuppe zeigen. Welche Kamera soll ich anzeigen?',
                reprompts: 'Welche DWD-Wetterkamera soll ich anzeigen, Hamburg, Hohenpeißenberg, Lindenberg, Offenbach, Schmücke, Warnemünde oder Wasserkuppe?',
                shouldEndSession: false,
            },
        ]);
    });

    describe('PreviousIntent', () => {
        alexaTest.test([
            {
                request: alexaTest.getIntentRequest('AMAZON.PreviousIntent'),
                says: 'Ich kann dir die Bilder von den DWD-Wetterkameras in Hamburg, Hohenpeißenberg, Lindenberg, Offenbach, Schmücke, Warnemünde und auf der Wasserkuppe zeigen. Welche Kamera soll ich anzeigen?',
                reprompts: 'Welche DWD-Wetterkamera soll ich anzeigen, Hamburg, Hohenpeißenberg, Lindenberg, Offenbach, Schmücke, Warnemünde oder Wasserkuppe?',
                shouldEndSession: false,
            },
        ]);
    });

    describe('PreviousIntent for Hamburg Südost', () => {
        alexaTest.test([
            {
                request: alexaTest.addEntityResolutionToRequest(
                    alexaTest.getIntentRequest('WeatherCamIntent', { webcam: 'Hamburg Südost' }),
                    'webcam', LIST_OF_WEBCAMS, 'Hamburg Südost', 'Hamburg-SO'),
                says: 'Hier ist die Kamera Hamburg Südost.',
                hasCardTitle: 'Hamburg Südost',
                hasCardTextLike: 'Quelle: Deutscher Wetterdienst',
                hasSmallImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Hamburg-SO/Hamburg-SO_latest_114.jpg',
                hasLargeImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Hamburg-SO/Hamburg-SO_latest_180.jpg',
                repromptsNothing: true, shouldEndSession: true,
            },
            {
                request: alexaTest.getIntentRequest('AMAZON.PreviousIntent'),
                says: 'Hier ist die Kamera Wasserkuppe Südwest.',
                hasCardTitle: 'Wasserkuppe Südwest',
                hasCardTextLike: 'Quelle: Deutscher Wetterdienst',
                hasSmallImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Wasserkuppe-SW/Wasserkuppe-SW_latest_114.jpg',
                hasLargeImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Wasserkuppe-SW/Wasserkuppe-SW_latest_180.jpg',
                repromptsNothing: true, shouldEndSession: true,
            },
        ]);
    });

    describe('PreviousIntent for Warnemünde Nordwest', () => {
        alexaTest.test([
            {
                request: alexaTest.addEntityResolutionToRequest(
                    alexaTest.getIntentRequest('WeatherCamIntent', { webcam: 'Warnemünde Nordwest' }),
                    'webcam', LIST_OF_WEBCAMS, 'Warnemünde Nordwest', 'Warnemuende-NW'),
                says: 'Hier ist die Kamera Warnemünde Nordwest.',
                hasCardTitle: 'Warnemünde Nordwest',
                hasCardTextLike: 'Quelle: Deutscher Wetterdienst',
                hasSmallImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Warnemuende-NW/Warnemuende-NW_latest_114.jpg',
                hasLargeImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Warnemuende-NW/Warnemuende-NW_latest_180.jpg',
                repromptsNothing: true, shouldEndSession: true,
            },
            {
                request: alexaTest.getIntentRequest('AMAZON.PreviousIntent'),
                says: 'Hier ist die Kamera Schmücke Südwest.',
                hasCardTitle: 'Schmücke Südwest',
                hasCardTextLike: 'Quelle: Deutscher Wetterdienst',
                hasSmallImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Schmuecke-SW/Schmuecke-SW_latest_114.jpg',
                hasLargeImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Schmuecke-SW/Schmuecke-SW_latest_180.jpg',
                repromptsNothing: true, shouldEndSession: true,
            },
        ]);
    });

    describe('NextIntent', () => {
        alexaTest.test([
            {
                request: alexaTest.getIntentRequest('AMAZON.NextIntent'),
                says: 'Ich kann dir die Bilder von den DWD-Wetterkameras in Hamburg, Hohenpeißenberg, Lindenberg, Offenbach, Schmücke, Warnemünde und auf der Wasserkuppe zeigen. Welche Kamera soll ich anzeigen?',
                reprompts: 'Welche DWD-Wetterkamera soll ich anzeigen, Hamburg, Hohenpeißenberg, Lindenberg, Offenbach, Schmücke, Warnemünde oder Wasserkuppe?',
                shouldEndSession: false,
            },
        ]);
    });

    describe('NextIntent for Hamburg Südost', () => {
        alexaTest.test([
            {
                request: alexaTest.addEntityResolutionToRequest(
                    alexaTest.getIntentRequest('WeatherCamIntent', { webcam: 'Hamburg Südost' }),
                    'webcam', LIST_OF_WEBCAMS, 'Hamburg Südost', 'Hamburg-SO'),
                says: 'Hier ist die Kamera Hamburg Südost.',
                hasCardTitle: 'Hamburg Südost',
                hasCardTextLike: 'Quelle: Deutscher Wetterdienst',
                hasSmallImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Hamburg-SO/Hamburg-SO_latest_114.jpg',
                hasLargeImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Hamburg-SO/Hamburg-SO_latest_180.jpg',
                repromptsNothing: true, shouldEndSession: true,
            },
            {
                request: alexaTest.getIntentRequest('AMAZON.NextIntent'),
                says: 'Hier ist die Kamera Hamburg Südwest.',
                hasCardTitle: 'Hamburg Südwest',
                hasCardTextLike: 'Quelle: Deutscher Wetterdienst',
                hasSmallImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Hamburg-SW/Hamburg-SW_latest_114.jpg',
                hasLargeImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Hamburg-SW/Hamburg-SW_latest_180.jpg',
                repromptsNothing: true, shouldEndSession: true,
            },
        ]);
    });

    describe('NextIntent for Wasserkuppe Südwest', () => {
        alexaTest.test([
            {
                request: alexaTest.addEntityResolutionToRequest(
                    alexaTest.getIntentRequest('WeatherCamIntent', { webcam: 'Wasserkuppe Südwest' }),
                    'webcam', LIST_OF_WEBCAMS, 'Wasserkuppe Südwest', 'Wasserkuppe-SW'),
                says: 'Hier ist die Kamera Wasserkuppe Südwest.',
                hasCardTitle: 'Wasserkuppe Südwest',
                hasCardTextLike: 'Quelle: Deutscher Wetterdienst',
                hasSmallImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Wasserkuppe-SW/Wasserkuppe-SW_latest_114.jpg',
                hasLargeImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Wasserkuppe-SW/Wasserkuppe-SW_latest_180.jpg',
                repromptsNothing: true, shouldEndSession: true,
            },
            {
                request: alexaTest.getIntentRequest('AMAZON.NextIntent'),
                says: 'Hier ist die Kamera Hamburg Südost.',
                hasCardTitle: 'Hamburg Südost',
                hasCardTextLike: 'Quelle: Deutscher Wetterdienst',
                hasSmallImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Hamburg-SO/Hamburg-SO_latest_114.jpg',
                hasLargeImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Hamburg-SO/Hamburg-SO_latest_180.jpg',
                repromptsNothing: true, shouldEndSession: true,
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
            {
                request: alexaTest.getSessionEndedRequest('ERROR'),
                saysNothing: true, repromptsNothing: true, shouldEndSession: true,
            },
        ]);
    });

    describe('LaunchRequest', () => {
        alexaTest.test([
            {
                request: alexaTest.getLaunchRequest(),
                says: 'Welche Kamera soll ich anzeigen?',
                reprompts: 'Welche DWD-Wetterkamera soll ich anzeigen, Hamburg, Hohenpeißenberg, Lindenberg, Offenbach, Schmücke, Warnemünde oder Wasserkuppe?',
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
                request: alexaTest.addEntityResolutionNoMatchToRequest(
                    alexaTest.getIntentRequest('WeatherCamIntent'), 'webcam', LIST_OF_WEBCAMS, 'Würzburg'),
                says: 'Ich kenne diese Kamera leider nicht.',
                repromptsNothing: true, shouldEndSession: true,
            },
        ]);
    });

    describe('WeatherCamIntent (multiple matches)', () => {
        alexaTest.test([
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
                hasAttributes: {
                    names: names => { return names[0] === 'Offenbach Ost' && names[1] === 'Offenbach West' && names.length === 2; },
                },
                shouldEndSession: false,
            },
        ]);
    });

    describe('WeatherCamIntent (matching previous value)', () => {
        alexaTest.test([
            {
                request: alexaTest.addEntityResolutionsToRequest(
                    alexaTest.getIntentRequest('WeatherCamIntent', { webcam: 'Hamburg' }),
                    [
                        { slotName: 'webcam', slotType: LIST_OF_WEBCAMS, value: 'Hamburg Südost', id: 'Hamburg-SO' },
                        { slotName: 'webcam', slotType: LIST_OF_WEBCAMS, value: 'Hamburg Südwest', id: 'Hamburg-SW' },
                    ]),
                elicitsSlot: 'webcam',
                says: 'Welche Kamera, Hamburg Südost oder Hamburg Südwest?',
                reprompts: 'Welche Kamera, Hamburg Südost oder Hamburg Südwest?',
                hasAttributes: {
                    names: names => { return names[0] === 'Hamburg Südost' && names[1] === 'Hamburg Südwest' && names.length === 2; },
                },
                shouldEndSession: false,
            },
            {
                request: alexaTest.addEntityResolutionsToRequest(
                    alexaTest.getIntentRequest('WeatherCamIntent', { webcam: 'Südwest' }),
                    [
                        { slotName: 'webcam', slotType: LIST_OF_WEBCAMS, value: 'Hamburg Südwest', id: 'Hamburg-SW' },
                        { slotName: 'webcam', slotType: LIST_OF_WEBCAMS, value: 'Schmücke Südwest', id: 'Schmuecke-SW' },
                        { slotName: 'webcam', slotType: LIST_OF_WEBCAMS, value: 'Hohenpeißenberg Südwest', id: 'Hohenpeissenberg-SW' },
                    ]),
                says: 'Hier ist die Kamera Hamburg Südwest.',
                hasCardTitle: 'Hamburg Südwest',
                hasCardTextLike: 'Quelle: Deutscher Wetterdienst',
                hasSmallImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Hamburg-SW/Hamburg-SW_latest_114.jpg',
                hasLargeImageUrlLike: 'https://opendata.dwd.de/weather/webcam/Hamburg-SW/Hamburg-SW_latest_180.jpg',
                repromptsNothing: true, shouldEndSession: true,
            },
        ]);
    });
});
