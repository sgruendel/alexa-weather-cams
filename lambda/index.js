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

import { resolveCamera, adjacentCamera } from './cameras.js';
import { presentCamera as getResponseFor } from './presentation.js';

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

const NavigationIntentHandler = {
    canHandle(handlerInput) {
        const { request } = handlerInput.requestEnvelope;
        return request.type === 'IntentRequest'
            && ['AMAZON.PreviousIntent', 'AMAZON.NextIntent'].includes(request.intent.name);
    },
    handle(handlerInput) {
        const current = handlerInput.attributesManager.getSessionAttributes().value;
        const direction = handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NextIntent' ? 1 : -1;
        const camera = adjacentCamera(current?.id, direction);
        return camera ? getResponseFor(handlerInput, camera) : HelpIntentHandler.handle(handlerInput);
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
                NavigationIntentHandler,
                CancelAndStopIntentHandler,
                SessionEndedRequestHandler)
            .addRequestInterceptors(LocalizationInterceptor)
            .addErrorHandlers(ErrorHandler)
            .withSkillId(SKILL_ID)
            .create();
    }

    return skill.invoke(event, context);
};
