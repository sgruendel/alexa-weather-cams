import { readFileSync } from 'node:fs';
import { verifyDialog } from '../ask.js';

const expectations = JSON.parse(readFileSync(new URL('./expectations.json', import.meta.url), 'utf8'));

describe('Alexa development skill dialogs', function () {
    this.timeout(90000);
    for (const [file, turns] of Object.entries(expectations)) {
        it(file.replace('.json', ''), async () => {
            await verifyDialog(new URL(file, import.meta.url), turns);
        });
    }
});
