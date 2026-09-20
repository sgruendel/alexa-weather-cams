import { expect } from 'chai';

import { configureImageProxy } from '../../scripts/configure-image-proxy.js';

function success(value = {}) {
    return { status: 0, stdout: JSON.stringify(value), stderr: '' };
}

describe('image proxy configuration', () => {
    it('creates a missing Function URL and preserves Lambda environment variables', () => {
        const calls = [];
        const runAws = args => {
            calls.push(args);
            const operation = args[1];
            if (operation === 'get-function-url-config') {
                return { status: 255, stdout: '', stderr: 'ResourceNotFoundException' };
            }
            if (operation === 'create-function-url-config') {
                return success({ FunctionUrl: 'https://example.lambda-url.eu-west-1.on.aws/' });
            }
            if (operation === 'get-function-configuration') {
                return success({ Environment: { Variables: { SKILL_ID: 'test-skill', LOG_LEVEL: 'debug' } } });
            }
            return success();
        };

        expect(configureImageProxy(runAws))
            .to.equal('https://example.lambda-url.eu-west-1.on.aws/image/');
        expect(calls.filter(args => args[1] === 'add-permission')).to.have.length(2);
        const update = calls.find(args => args[1] === 'update-function-configuration');
        const environment = JSON.parse(update[update.indexOf('--environment') + 1]);
        expect(environment).to.deep.equal({ Variables: {
            SKILL_ID: 'test-skill',
            LOG_LEVEL: 'debug',
            IMAGE_PROXY_BASE_URL: 'https://example.lambda-url.eu-west-1.on.aws/image/',
        } });
    });

    it('reuses an existing Function URL and tolerates existing permissions', () => {
        const calls = [];
        const runAws = args => {
            calls.push(args);
            const operation = args[1];
            if (operation === 'get-function-url-config') {
                return success({ FunctionUrl: 'https://existing.lambda-url.eu-west-1.on.aws/' });
            }
            if (operation === 'add-permission') {
                return { status: 255, stdout: '', stderr: 'ResourceConflictException' };
            }
            if (operation === 'get-function-configuration') return success({});
            return success();
        };

        expect(configureImageProxy(runAws))
            .to.equal('https://existing.lambda-url.eu-west-1.on.aws/image/');
        expect(calls.some(args => args[1] === 'create-function-url-config')).to.equal(false);
    });
});
