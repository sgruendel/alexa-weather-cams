import Alexa from 'ask-sdk-core';
import i18next from 'i18next';
import sprintf from 'i18next-sprintf-postprocessor';
import winston from 'winston';

import { SKILL_ID } from './config.js';

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
    exitOnError: false,
});

import model from './de-DE.json' with { type: 'json' };

import { resolveCamera } from './cameras.js';
const COPYRIGHT = 'Quelle: Deutscher Wetterdienst';

const languageStrings = {
    de: {
        translation: {
            FALLBACK_MESSAGE: 'Dort gibt es leider keine DWD-Wetterkamera. Ich kann dir die Bilder von Hamburg, Hohenpeißenberg, Lindenberg, Offenbach, Schmücke, Warnemünde und der Wasserkuppe zeigen. Welche Kamera soll ich anzeigen?',
            HELP_MESSAGE: 'Ich kann dir die Bilder von den DWD-Wetterkameras in Hamburg, Hohenpeißenberg, Lindenberg, Offenbach, Schmücke, Warnemünde und auf der Wasserkuppe zeigen. Welche Kamera soll ich anzeigen?',
            HELP_REPROMPT: 'Welche DWD-Wetterkamera soll ich anzeigen, Hamburg, Hohenpeißenberg, Lindenberg, Offenbach, Schmücke, Warnemünde oder Wasserkuppe?',
            STOP_MESSAGE: '<say-as interpret-as="interjection">bis dann</say-as>.',
            UNKNOWN_WEBCAM: 'Ich kenne diese Kamera leider nicht.',
            NOT_UNDERSTOOD_MESSAGE: 'Entschuldigung, das verstehe ich nicht. Bitte wiederhole das?',
        },
    },
};
i18next.use(sprintf).init({
    overloadTranslationOptionHandler: sprintf.overloadTranslationOptionHandler,
    resources: languageStrings,
    returnObjects: true,
});

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
        .withShouldEndSession(true)
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

        const slot = request.intent?.slots?.webcam;
        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        if (request.type === 'LaunchRequest') {
            return handlerInput.responseBuilder
                .speak('Welche Kamera soll ich anzeigen?')
                .reprompt(requestAttributes.t('HELP_REPROMPT'))
                .getResponse();
        }
        const resolution = resolveCamera(slot, sessionAttributes.pendingChoices);
        if (resolution.kind === 'no-match') {
            return handlerInput.responseBuilder
                .speak(requestAttributes.t('UNKNOWN_WEBCAM'))
                .withShouldEndSession(true)
                .getResponse();
        }
        if (resolution.kind === 'selected') {
            delete sessionAttributes.pendingChoices;
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
            return getResponseFor(handlerInput, resolution.camera);
        }
        let prompt = 'Welche Kamera soll ich anzeigen?';
        if (resolution.kind === 'ambiguous') {
            const names = resolution.choices.map(camera => camera.name);
            prompt = 'Welche Kamera, ' + names.slice(0, -1).join(', ') + ' oder ' + names.at(-1) + '?';
            sessionAttributes.pendingChoices = resolution.choices.map(camera => camera.id);
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        }
        return handlerInput.responseBuilder
            .speak(prompt)
            .reprompt(prompt)
            .addElicitSlotDirective('webcam')
            .getResponse();
    },
};

const FallbackIntentHandler = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        logger.debug('request', request);

        const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
        return handlerInput.responseBuilder
            .speak(requestAttributes.t('FALLBACK_MESSAGE'))
            .reprompt(requestAttributes.t('HELP_REPROMPT'))
            .getResponse();
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
            .withShouldEndSession(true)
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
        return handlerInput.responseBuilder.withShouldEndSession(true).getResponse();
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
        i18next.changeLanguage(Alexa.getLocale(handlerInput.requestEnvelope));

        const attributes = handlerInput.attributesManager.getRequestAttributes();
        attributes.t = (...args) => {
            return i18next.t(...args);
        };
    },
};

let skill;

export const handler = async function (event, context) {
    if (!skill) {
        skill = Alexa.SkillBuilders.custom()
            .addRequestHandlers(
                WeatherCamIntentHandler,
                FallbackIntentHandler,
                HelpIntentHandler,
                PreviousIntentHandler,
                NextIntentHandler,
                CancelAndStopIntentHandler,
                SessionEndedRequestHandler)
            .addRequestInterceptors(LocalizationInterceptor)
            .addErrorHandlers(ErrorHandler)
            .withSkillId(SKILL_ID)
            .create();
    }

    return skill.invoke(event, context);
};
