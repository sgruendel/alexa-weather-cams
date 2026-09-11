import { SKILL_ID } from '../../config.js';

let requestId = 0;

function requestEnvelope(request, { sessionNew = true, attributes = {} } = {}) {
    requestId += 1;
    const application = { applicationId: SKILL_ID };
    const user = { userId: 'amzn1.ask.account.TEST' };

    return {
        version: '1.0',
        session: {
            new: sessionNew,
            sessionId: `test-session-${requestId}`,
            application,
            attributes,
            user,
        },
        context: {
            System: {
                application,
                user,
                device: {
                    deviceId: 'test-device',
                    supportedInterfaces: {},
                },
                apiEndpoint: 'https://api.amazonalexa.com',
            },
        },
        request: {
            requestId: `test-request-${requestId}`,
            timestamp: new Date().toISOString(),
            locale: 'de-DE',
            ...request,
        },
    };
}

export function launchRequest(options = {}) {
    return requestEnvelope({ type: 'LaunchRequest' }, options);
}

export function intentRequest(name, slots = {}, dialogState = 'COMPLETED', options = {}) {
    return requestEnvelope(
        {
            type: 'IntentRequest',
            dialogState,
            intent: {
                name,
                confirmationStatus: 'NONE',
                slots,
            },
        },
        options,
    );
}

export function sessionEndedRequest(reason = 'USER_INITIATED', options = {}) {
    const request = {
        type: 'SessionEndedRequest',
        reason,
        ...(reason === 'ERROR' ? { error: { type: 'INVALID_RESPONSE', message: 'Test session error' } } : {}),
    };
    return requestEnvelope(request, { sessionNew: false, ...options });
}

export function unresolvedSlot(name) {
    return {
        name,
        confirmationStatus: 'NONE',
    };
}

export function resolvedSlot(name, spokenValue, matches, status = 'ER_SUCCESS_MATCH') {
    return {
        name,
        value: spokenValue,
        confirmationStatus: 'NONE',
        resolutions: {
            resolutionsPerAuthority: [
                {
                    authority: `amzn1.er-authority.echo-sdk.${SKILL_ID}.${name}`,
                    status: { code: status },
                    values: matches.map((value) => ({ value })),
                },
            ],
        },
    };
}
