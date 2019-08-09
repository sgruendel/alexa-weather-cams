'use strict';

const Alexa = require('ask-sdk-core');
const i18next = require('i18next');
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

var model;
try {
    model = require('models/de-DE');
} catch (err) {
    // for mocha tests
    model = require('../models/de-DE');
}

const SKILL_ID = 'amzn1.ask.skill.6896cced-41a6-4134-912d-c74db2be8559';
const ER_SUCCESS_MATCH = 'ER_SUCCESS_MATCH';
const ER_SUCCESS_NO_MATCH = 'ER_SUCCESS_NO_MATCH';
const COPYRIGHT = 'Quelle: Deutscher Wetterdienst';

const languageStrings = {
    de: {
        translation: {
            HELP_MESSAGE: 'Ich kann dir die Bilder von den DWD-Wetterkameras in Hamburg, Hohenpeißenberg, Offenbach, Schmücke und Warnemünde zeigen. Welche Kamera soll ich anzeigen?',
            HELP_REPROMPT: 'Welche DWD-Wetterkamera soll ich anzeigen, Hamburg, Hohenpeißenberg, Offenbach, Schmücke oder Warnemünde?',
            STOP_MESSAGE: '<say-as interpret-as="interjection">bis dann</say-as>.',
            UNKNOWN_WEBCAM: 'Ich kenne diese Kamera leider nicht.',
            NOT_UNDERSTOOD_MESSAGE: 'Entschuldigung, das verstehe ich nicht. Bitte wiederhole das?',
        },
    },
};

function getResponseFor(handlerInput, value) {
    const baseUrl = 'https://opendata.dwd.de/weather/webcam/' + value.id + '/' + value.id + '_latest_';
    if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope).Display) {
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

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.value = value;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    return handlerInput.responseBuilder
        .speak('Hier ist die Kamera ' + value.name + '.')
        .withStandardCard(value.name, COPYRIGHT, baseUrl + '114.jpg', baseUrl + '180.jpg')
        .getResponse();
}

const WeatherCamIntentHandler = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'LaunchRequest'
            || (request.type === 'IntentRequest' && request.intent.name === 'WeatherCamIntent');
    },
    handle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        logger.debug('request', request);

        // delegate to Alexa to collect all the required slots
        if (request.dialogState && request.dialogState !== 'COMPLETED') {
            logger.debug('dialog state is ' + request.dialogState + ' => adding delegate directive');
            return handlerInput.responseBuilder
                .addDelegateDirective()
                .getResponse();
        }

        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const slots = request.intent && request.intent.slots;
        const rpa = slots
            && slots.webcam
            && slots.webcam.resolutions
            && slots.webcam.resolutions.resolutionsPerAuthority[0];
        if (!rpa) {
            return handlerInput.responseBuilder
                .speak('Welche Kamera soll ich anzeigen?')
                .reprompt(requestAttributes.t('HELP_REPROMPT'))
                .getResponse();
        }
        logger.debug('webcam slot', slots.webcam);

        switch (rpa.status.code) {
        case ER_SUCCESS_NO_MATCH:
            // should never happen, as we only accept Slot type’s values and synonyms
            logger.error('no match for webcam ' + slots.webcam.value);
            return handlerInput.responseBuilder
                .speak(requestAttributes.t('UNKNOWN_WEBCAM'))
                .getResponse();

        case ER_SUCCESS_MATCH:
            if (rpa.values.length > 1) {
                const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
                if (sessionAttributes.names) {
                    logger.debug('previous names', sessionAttributes.names);
                    const foundValue = rpa.values.find(value => {
                        return sessionAttributes.names.find(name => {
                            return name === value.value.name;
                        });
                    });
                    if (foundValue) {
                        logger.info('found matching previous answer option', foundValue);
                        sessionAttributes.names = undefined;
                        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
                        return getResponseFor(handlerInput, foundValue.value);
                    }
                }

                logger.info('multiple matches for ' + slots.webcam.value);
                var prompt = 'Welche Kamera';
                const size = rpa.values.length;

                var names = [];
                rpa.values.forEach((element, index) => {
                    prompt += ((index === size - 1) ? ' oder ' : ', ') + element.value.name;
                    names.push(element.value.name);
                });

                prompt += '?';
                logger.info('eliciting webcam slot: ' + prompt);

                sessionAttributes.names = names;
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

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

        return getResponseFor(handlerInput, value);
    },
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        logger.debug('request', request);

        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        return handlerInput.responseBuilder
            .speak(requestAttributes.t('HELP_MESSAGE'))
            .reprompt(requestAttributes.t('HELP_REPROMPT'))
            .getResponse();
    },
};

const PreviousIntentHandler = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.PreviousIntent';
    },
    handle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        logger.debug('request', request);

        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        if (sessionAttributes.value) {
            logger.debug('last webcam', sessionAttributes.value);
            const foundIndex = model.interactionModel.languageModel.types[0].values.findIndex(value => {
                return value.id === sessionAttributes.value.id;
            });
            if (foundIndex > 0) {
                const previousValue = model.interactionModel.languageModel.types[0].values[foundIndex - 1];
                logger.info('found previous webcam', previousValue);
                return getResponseFor(handlerInput, { id: previousValue.id, name: previousValue.name.value });
            } else if (foundIndex === 0) {
                const noOfWebcams = model.interactionModel.languageModel.types[0].values.length;
                const lastValue = model.interactionModel.languageModel.types[0].values[noOfWebcams - 1];
                logger.info('wrapping around to last webcam', lastValue);
                return getResponseFor(handlerInput, { id: lastValue.id, name: lastValue.name.value });
            } else {
                // should never happen
                logger.error('no match for last webcam', sessionAttributes.value);
                // just reuse the value
                return getResponseFor(handlerInput, sessionAttributes.value);
            }
        }

        // no webcam was shown previously, so just respond with help message
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        return handlerInput.responseBuilder
            .speak(requestAttributes.t('HELP_MESSAGE'))
            .reprompt(requestAttributes.t('HELP_REPROMPT'))
            .getResponse();
    },
};

const NextIntentHandler = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NextIntent';
    },
    handle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        logger.debug('request', request);

        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        if (sessionAttributes.value) {
            logger.debug('last webcam', sessionAttributes.value);
            const foundIndex = model.interactionModel.languageModel.types[0].values.findIndex(value => {
                return value.id === sessionAttributes.value.id;
            });
            const noOfWebcams = model.interactionModel.languageModel.types[0].values.length;
            if (foundIndex === noOfWebcams - 1) {
                const firstValue = model.interactionModel.languageModel.types[0].values[0];
                logger.info('wrapping around to first webcam', firstValue);
                return getResponseFor(handlerInput, { id: firstValue.id, name: firstValue.name.value });
            } else if (foundIndex >= 0) {
                const nextValue = model.interactionModel.languageModel.types[0].values[foundIndex + 1];
                logger.info('found next webcam', nextValue);
                return getResponseFor(handlerInput, { id: nextValue.id, name: nextValue.name.value });
            } else {
                // should never happen
                logger.error('no match for last webcam', sessionAttributes.value);
                // just reuse the value
                return getResponseFor(handlerInput, sessionAttributes.value);
            }
        }

        // no webcam was shown previously, so just respond with help message
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        return handlerInput.responseBuilder
            .speak(requestAttributes.t('HELP_MESSAGE'))
            .reprompt(requestAttributes.t('HELP_REPROMPT'))
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
        const { request } = handlerInput.requestEnvelope;
        logger.debug('request', request);

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
        const { request } = handlerInput.requestEnvelope;
        try {
            if (request.reason === 'ERROR') {
                logger.error(request.error.type + ': ' + request.error.message);
            }
        } catch (err) {
            logger.error(err.stack || err.toString(), request);
        }

        logger.debug('session ended', request);
        return handlerInput.responseBuilder.getResponse();
    },
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        logger.error(error.stack || error.toString(), handlerInput.requestEnvelope.request);
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const speechOutput = requestAttributes.t('NOT_UNDERSTOOD_MESSAGE');
        return handlerInput.responseBuilder
            .speak(speechOutput)
            .reprompt(speechOutput)
            .getResponse();
    },
};

const LocalizationInterceptor = {
    process(handlerInput) {
        i18next.use(sprintf).init({
            lng: Alexa.getLocale(handlerInput.requestEnvelope),
            overloadTranslationOptionHandler: sprintf.overloadTranslationOptionHandler,
            resources: languageStrings,
            returnObjects: true,
        });

        const attributes = handlerInput.attributesManager.getRequestAttributes();
        attributes.t = (...args) => {
            return i18next.t(...args);
        };
    },
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        WeatherCamIntentHandler,
        HelpIntentHandler,
        PreviousIntentHandler,
        NextIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler)
    .addRequestInterceptors(LocalizationInterceptor)
    .addErrorHandlers(ErrorHandler)
    .withSkillId(SKILL_ID)
    .lambda();
if (dashbot) exports.handler = dashbot.handler(exports.handler);
