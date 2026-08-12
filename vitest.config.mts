import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Only the pure money model is unit-tested; UI is verified manually.
        include: ['lib/**/*.test.ts'],
        environment: 'node',
    },
});
