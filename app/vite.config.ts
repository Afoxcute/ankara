import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
      },
    }),
  ],
  optimizeDeps: {
    include: [
      'thirdweb',
      'thirdweb/react',
      'thirdweb/wallets',
    ],
    // Exclude problematic dynamic imports from pre-bundling
    exclude: [],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'thirdweb-core': ['thirdweb'],
          'thirdweb-react': ['thirdweb/react'],
          'thirdweb-wallets': ['thirdweb/wallets'],
        },
      },
    },
    commonjsOptions: {
      include: [/thirdweb/, /node_modules/],
    },
  },
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..'],
    },
  },
})
