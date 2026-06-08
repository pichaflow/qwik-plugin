import { defineConfig } from 'vitest/config';
import { qwikVite } from '@builder.io/qwik/optimizer';

export default defineConfig({
  plugins: [qwikVite()],
  test: {
    // Qwik's createDOM() ships its own DOM — jsdom conflicts with node.isAncestor
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
