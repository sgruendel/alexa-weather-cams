import Alexa from 'ask-sdk-core';

export const COPYRIGHT = 'Quelle: Deutscher Wetterdienst';

export function presentCamera(handlerInput, camera) {
    const baseUrl = `https://opendata.dwd.de/weather/webcam/${camera.id}/${camera.id}_latest_`;
    const interfaces = Alexa.getSupportedInterfaces(handlerInput.requestEnvelope);
    const builder = handlerInput.responseBuilder;
    if (interfaces['Alexa.Presentation.APL']) {
        builder.addDirective({
            type: 'Alexa.Presentation.APL.RenderDocument',
            token: `camera-${handlerInput.requestEnvelope.request.requestId}`,
            document: {
                type: 'APL',
                version: '1.0',
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
                            { type: 'Image', source: '${camera.url}', width: '100%', height: '60vh', scale: 'best-fit' },
                            { type: 'Text', text: '${camera.attribution}', fontSize: '3vh', textAlign: 'center', maxLines: 1 },
                        ],
                    }],
                },
            },
            datasources: { camera: { name: camera.name, url: baseUrl + '816.jpg', attribution: COPYRIGHT } },
        });
    } else if (interfaces.Display) {
        const image = new Alexa.ImageHelper().withDescription(COPYRIGHT)
            .addImageInstance(baseUrl + '400.jpg', 'X_SMALL', 400, 225)
            .addImageInstance(baseUrl + '640.jpg', 'SMALL', 640, 360)
            .addImageInstance(baseUrl + '816.jpg', 'MEDIUM', 816, 459)
            .getImage();
        builder.addRenderTemplateDirective({ type: 'BodyTemplate7', backButton: 'HIDDEN', image, title: camera.name });
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
