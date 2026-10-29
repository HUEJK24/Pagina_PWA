import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const ngrokHosts = ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.io']

const proxy = {
  '/api': {
    target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: null,
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ngrokHosts,
    proxy,
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ngrokHosts,
    proxy,
  },
})
