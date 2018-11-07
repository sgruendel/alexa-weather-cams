'use strict';

const Alexa = require('ask-sdk-core');
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');
const dashbot = process.env.DASHBOT_API_KEY ? require('dashbot')(process.env.DASHBOT_API_KEY).alexa : undefined;
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
    exitOnError: false,
});

const SKILL_ID = 'amzn1.ask.skill.6896cced-41a6-4134-912d-c74db2be8559';
const ER_SUCCESS_MATCH = 'ER_SUCCESS_MATCH';
const ER_SUCCESS_NO_MATCH = 'ER_SUCCESS_NO_MATCH';
const COPYRIGHT = 'Quelle: Deutscher Wetterdienst';

const languageStrings = {
    de: {
        translation: {
            HELP_MESSAGE: 'Du kannst sagen „Frage Wetter Kamera nach Hamburg elbabwärts“, oder du kannst „Beenden“ sagen. Was soll ich tun?',
            HELP_REPROMPT: 'Was soll ich tun?',
            STOP_MESSAGE: '<say-as interpret-as="interjection">bis dann</say-as>.',
        },
    },
};

// returns true if the skill is running on a device with a display (show|spot)
function supportsDisplay(handlerInput) {
    const { context } = handlerInput.requestEnvelope;
    return context
        && context.System
        && context.System.device
        && context.System.device.supportedInterfaces
        && context.System.device.supportedInterfaces.Display;
}

const WeatherCamIntentHandler = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'IntentRequest' && request.intent.name === 'WeatherCamIntent';
    },
    handle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        // delegate to Alexa to collect all the required slots
        if (request.dialogState && request.dialogState !== 'COMPLETED') {
            logger.debug('dialog state is ' + request.dialogState + ' => adding delegate directive');
            return handlerInput.responseBuilder
                .addDelegateDirective()
                .getResponse();
        }

        const { slots } = request.intent;
        logger.debug('webcam slot', slots.webcam);

        const rpa = slots.webcam
            && slots.webcam.resolutions
            && slots.webcam.resolutions.resolutionsPerAuthority[0];
        switch (rpa.status.code) {
        case ER_SUCCESS_NO_MATCH:
            logger.error('no match for webcam ' + slots.webcam.value);
            return handlerInput.responseBuilder
                .speak('Ich kenne diese Kamera leider nicht.')
                .getResponse();

        case ER_SUCCESS_MATCH:
            if (rpa.values.length > 1) {
                logger.info('multiple matches for ' + slots.webcam.value);
                var prompt = 'Welche Kamera';
                const size = rpa.values.length;

                rpa.values.forEach((element, index) => {
                    prompt += ((index === size - 1) ? ' oder ' : ', ') + element.value.name;
                });

                prompt += '?';
                logger.info('eliciting webcam slot: ' + prompt);
                return handlerInput.responseBuilder
                    .speak(prompt)
                    .reprompt(prompt)
                    .addElicitSlotDirective(slots.webcam.name)
                    .getResponse();
            }
            break;

        default:
            logger.error('unexpected status code ' + rpa.status.code);
        }

        const value = rpa.values[0].value;
        logger.info('webcam value', value);

        const baseUrl = 'https://opendata.dwd.de/weather/webcam/' + value.id + '/' + value.id + '_latest_';
        if (supportsDisplay(handlerInput)) {
            const webcamImage = new Alexa.ImageHelper()
                .withDescription(COPYRIGHT)
                .addImageInstance(baseUrl + '400.jpg', 'X_SMALL', 400, 225)
                .addImageInstance(baseUrl + '640.jpg', 'SMALL', 640, 360)
                .addImageInstance(baseUrl + '816.jpg', 'MEDIUM', 816, 459)
                // .addImageInstance(baseUrl + '1200.jpg', 'LARGE', 1200, 675)
                // .addImageInstance(baseUrl + '1920.jpg', 'X_LARGE', 1920, 1080)
                .getImage();
            handlerInput.responseBuilder
                .addRenderTemplateDirective({
                    type: 'BodyTemplate7',
                    backButton: 'HIDDEN',
                    image: webcamImage,
                    title: value.name,
                });
        }

        return handlerInput.responseBuilder
            .speak('Hier ist die Kamera ' + value.name + '.')
            .withStandardCard(value.name, COPYRIGHT, baseUrl + '114.jpg', baseUrl + '180.jpg')
            .getResponse();
    },
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'LaunchRequest'
            || (request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent');
    },
    handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const speechOutput = requestAttributes.t('HELP_MESSAGE');
        const repromptSpeechOutput = requestAttributes.t('HELP_REPROMPT');
        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt(repromptSpeechOutput)
            .getResponse();
    },
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'IntentRequest'
            && (request.intent.name === 'AMAZON.CancelIntent' || request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const speechOutput = requestAttributes.t('STOP_MESSAGE');
        return handlerInput.responseBuilder
            .speak(speechOutput)
            .getResponse();
    },
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        logger.info('Session ended with reason: ' + handlerInput.requestEnvelope.request.reason);
        return handlerInput.responseBuilder.getResponse();
    },
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        logger.error('unhandled error', { message: error.message, stack: error.stack });
        return handlerInput.responseBuilder
            .speak('Entschuldigung, das verstehe ich nicht. Bitte wiederhole das?')
            .reprompt('Entschuldigung, das verstehe ich nicht. Bitte wiederhole das?')
            .getResponse();
    },
};

const LocalizationInterceptor = {
    process(handlerInput) {
        const localizationClient = i18n.use(sprintf).init({
            lng: handlerInput.requestEnvelope.request.locale,
            overloadTranslationOptionHandler: sprintf.overloadTranslationOptionHandler,
            resources: languageStrings,
            returnObjects: true,
        });

        const attributes = handlerInput.attributesManager.getRequestAttributes();
        attributes.t = (...args) => {
            return localizationClient.t(...args);
        };
    },
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        WeatherCamIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler)
    .addRequestInterceptors(LocalizationInterceptor)
    .addErrorHandlers(ErrorHandler)
    .withSkillId(SKILL_ID)
    .lambda();
if (dashbot) exports.handler = dashbot.handler(exports.handler);
