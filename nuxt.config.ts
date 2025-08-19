// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui-pro'
  ],

  // Build configuration for mobile apps
  ssr: true,

  devtools: {
    enabled: true
  },

  // App configuration
  app: {
    head: {
      viewport: 'width=device-width,initial-scale=1',
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.json' }
      ],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Canvas - The fastest, most intuitive digital workspace. Minimalist block-based editor with AI co-pilot.' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  // Runtime config for environment variables
  runtimeConfig: {
    // Private keys (only available on server-side)
    databaseUrl: process.env.DATABASE_URL,

    // Public keys (exposed to client-side)
    public: {
      appVersion: process.env.NUXT_APP_VERSION || '0.1.0',
      buildId: process.env.NUXT_APP_BUILD_ID || 'dev',
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api'
    }
  },

  routeRules: {
    '/': { prerender: true }
  },

  // Optimization for mobile performance
  experimental: {
    payloadExtraction: false
  },

  compatibilityDate: '2025-01-15',

  // Nitro configuration for static generation
  nitro: {
    preset: 'vercel-edge'
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
