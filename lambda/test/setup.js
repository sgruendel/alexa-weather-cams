import nock from 'nock';

// override .env, which may set LOG_LEVEL=debug
process.env.LOG_LEVEL = 'info';

before(() => {
    nock.disableNetConnect();
});

afterEach(function () {
    const pendingMocks = nock.pendingMocks();
    nock.cleanAll();
    if (this.currentTest?.state === 'passed' && pendingMocks.length > 0) {
        throw new Error(`Not all expected HTTP requests were made:\n${pendingMocks.join('\n')}`);
    }
});

after(() => {
    nock.enableNetConnect();
});
