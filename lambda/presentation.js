import Alexa from 'ask-sdk-core';

import { DWD_WEBCAM_BASE_URL } from './config.js';

export const COPYRIGHT = 'Quelle: Deutscher Wetterdienst';

function screenImageUrl(cameraId, dwdUrl) {
    const proxy = process.env.IMAGE_PROXY_BASE_URL?.replace(/\/+$/, '');
    if (!proxy) return dwdUrl;
    const cacheKey = Math.floor(Date.now() / 60000);
    return `${proxy}/${cameraId}/816.jpg?v=${cacheKey}`;
}

export function presentCamera(handlerInput, camera) {
    const baseUrl = `${DWD_WEBCAM_BASE_URL}/${camera.id}/${camera.id}_latest_`;
    const interfaces = Alexa.getSupportedInterfaces(handlerInput.requestEnvelope);
    const builder = handlerInput.responseBuilder;
    if (interfaces['Alexa.Presentation.APL']) {
        builder.addDirective({
            type: 'Alexa.Presentation.APL.RenderDocument',
            token: `camera-${handlerInput.requestEnvelope.request.requestId}`,
            document: {
                type: 'APL',
                version: '1.1',
                theme: 'dark',
                mainTemplate: {
                    parameters: ['camera'],
                    items: [{
                        type: 'Container',
                        width: '100vw',
                        height: '100vh',
                        paddingLeft: '8vw',
                        paddingRight: '8vw',
                        paddingTop: '8vh',
                        paddingBottom: '8vh',
                        items: [
                            { type: 'Text', text: '${camera.name}', fontSize: '5vh', textAlign: 'center', maxLines: 1 },
                            {
                                type: 'Image', source: '${camera.url}', width: '100%', height: '60vh', scale: 'best-fit',
                                accessibilityLabel: 'Wetterkamera ${camera.name}. ${camera.attribution}.',
                            },
                            { type: 'Text', text: '${camera.attribution}', fontSize: '3vh', textAlign: 'center', maxLines: 1 },
                        ],
                    }],
                },
            },
            datasources: {
                camera: {
                    name: camera.name,
                    url: screenImageUrl(camera.id, baseUrl + '816.jpg'),
                    attribution: COPYRIGHT,
                },
            },
        });
    } else {
        builder.withShouldEndSession(true);
    }
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    attributes.value = camera;
    handlerInput.attributesManager.setSessionAttributes(attributes);
    return builder.speak(`Hier ist die Kamera ${camera.name}.`)
        .withStandardCard(camera.name, COPYRIGHT, baseUrl + '114.jpg', baseUrl + '180.jpg')
        .getResponse();
}
