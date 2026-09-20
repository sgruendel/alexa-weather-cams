import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FUNCTION_NAME = 'weatherCams';
const REGION = 'eu-west-1';
const sourceFile = fileURLToPath(import.meta.url);

function aws(args) {
    return spawnSync('aws', ['--region', REGION, ...args], {
        encoding: 'utf8',
        env: { ...process.env, AWS_PAGER: '' },
    });
}

function requireSuccess(result, action) {
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`${action} failed: ${(result.stderr || result.stdout).trim()}`);
    }
    return result.stdout ? JSON.parse(result.stdout) : undefined;
}

function addPermission(runAws, args) {
    const result = runAws(['lambda', 'add-permission', '--function-name', FUNCTION_NAME, ...args]);
    if (result.status === 0 || result.stderr.includes('ResourceConflictException')) return;
    requireSuccess(result, 'Adding the Function URL permission');
}

export function configureImageProxy(runAws = aws) {
    requireSuccess(
        runAws(['lambda', 'wait', 'function-updated', '--function-name', FUNCTION_NAME]),
        'Waiting for the Lambda function',
    );

    let result = runAws(['lambda', 'get-function-url-config', '--function-name', FUNCTION_NAME]);
    let urlConfig;
    if (result.status === 0) {
        urlConfig = requireSuccess(result, 'Reading the Function URL');
    } else if (result.stderr.includes('ResourceNotFoundException')) {
        result = runAws([
            'lambda', 'create-function-url-config',
            '--function-name', FUNCTION_NAME,
            '--auth-type', 'NONE',
        ]);
        urlConfig = requireSuccess(result, 'Creating the Function URL');
    } else {
        requireSuccess(result, 'Reading the Function URL');
    }

    addPermission(runAws, [
        '--statement-id', 'ImageProxyInvokeUrl',
        '--action', 'lambda:InvokeFunctionUrl',
        '--principal', '*',
        '--function-url-auth-type', 'NONE',
    ]);
    addPermission(runAws, [
        '--statement-id', 'ImageProxyInvokeFunction',
        '--action', 'lambda:InvokeFunction',
        '--principal', '*',
        '--invoked-via-function-url',
    ]);

    const configuration = requireSuccess(
        runAws(['lambda', 'get-function-configuration', '--function-name', FUNCTION_NAME]),
        'Reading the Lambda configuration',
    );
    const imageBaseUrl = new URL('image/', urlConfig.FunctionUrl).toString();
    const variables = {
        ...configuration.Environment?.Variables,
        IMAGE_PROXY_BASE_URL: imageBaseUrl,
    };
    requireSuccess(runAws([
        'lambda', 'update-function-configuration',
        '--function-name', FUNCTION_NAME,
        '--environment', JSON.stringify({ Variables: variables }),
    ]), 'Configuring the image proxy URL');
    requireSuccess(
        runAws(['lambda', 'wait', 'function-updated', '--function-name', FUNCTION_NAME]),
        'Waiting for the image proxy configuration',
    );

    return imageBaseUrl;
}

if (process.argv[1] && resolve(process.argv[1]) === sourceFile) {
    const imageBaseUrl = configureImageProxy();
    console.log(`APL image proxy configured at ${imageBaseUrl}`);
}
