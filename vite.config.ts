import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import {
  handleAccess,
  handleAdminBalls,
  handleAdminLeagues,
  handleAdminMatches,
  handleAdminPlayers,
  handleAdminSubstitutions,
  handleLogout,
  handleSession,
} from './api/_lib/api-handlers.ts'

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-api-routes',
        configureServer(server) {
          const routes = new Map([
            ['/api/access', handleAccess],
            ['/api/session', handleSession],
            ['/api/logout', handleLogout],
            ['/api/admin/players', handleAdminPlayers],
            ['/api/admin/leagues', handleAdminLeagues],
            ['/api/admin/matches', handleAdminMatches],
            ['/api/admin/substitutions', handleAdminSubstitutions],
            ['/api/admin/balls', handleAdminBalls],
          ])
          server.middlewares.use((req, res, next) => {
            const pathname = req.url?.split('?')[0] ?? ''
            const handler = routes.get(pathname)
            if (!handler) return next()
            void handler(req, res)
          })
        },
      },
      VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Liga de Pádel',
        short_name: 'Pádel',
        description: 'Gestiona la liga de pádel entre amigos',
        lang: 'es',
        theme_color: '#14532d',
        background_color: '#14532d',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Las llamadas a Supabase siempre van a red (las escrituras requieren conexión)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
            handler: 'NetworkOnly',
          },
        ],
      },
      }),
    ],
  }
})
