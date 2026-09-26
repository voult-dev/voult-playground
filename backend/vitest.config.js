import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    restoreMocks: true,
    clearMocks: true,
    // Transform @voult/* from node_modules so vi.mock('@voult/sdk') also applies inside
    // @voult/express (it imports the SDK itself). Without this the router calls the real SDK.
    server: { deps: { inline: [/@voult\//] } },
  },
});
