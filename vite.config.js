import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue()
    // PWA désactivé en développement pour éviter les problèmes de cache
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['favicon.ico'],
    //   manifest: {
    //     name: 'Gestion de Projets & Tickets',
    //     short_name: 'Tickets',
    //     description: 'Application de gestion de projets, tickets et sprints avec synchronisation Odoo',
    //     theme_color: '#4DBA87',
    //     background_color: '#ffffff',
    //     display: 'standalone',
    //     start_url: '/',
    //     icons: [
    //       {
    //         src: '/icon-192x192.svg',
    //         sizes: '192x192',
    //         type: 'image/svg+xml',
    //         purpose: 'any maskable'
    //       },
    //       {
    //         src: '/icon-512x512.svg',
    //         sizes: '512x512',
    //         type: 'image/svg+xml',
    //         purpose: 'any maskable'
    //       }
    //     ]
    //   },
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    //     runtimeCaching: [...]
    //   },
    //   devOptions: {
    //     enabled: false
    //   }
    // })
  ]
})
