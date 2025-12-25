import {defineConfig} from 'vitest/config';
import {playwright} from '@vitest/browser-playwright';

const isCI = process.env.CI === 'true';

export default defineConfig({
    test: {
        globals: true,
        browser: {
            enabled: true,
            provider: playwright({}),
            instances: [
                { browser: 'chromium' },
            ],
            headless: isCI ? true : false,
            // viewport: { width: 1280, height: 800 }, // optional
        },
    },
});
