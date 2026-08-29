import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'convex/**/*.test.ts'],
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // 業務データ(Convexへのquery/mutation通信)はキャッシュ対象にしない。
      // 静的アセット(HTML/CSS/JS/icons/character images)のみをprecacheする。
      // docs/technical-design.md #59-61 (PWA Policy / Service Worker)
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webp,woff2,riv}'],
      },
      manifest: {
        name: 'PDCA GACHA',
        short_name: 'PDCA GACHA',
        description: '今日も1周だけ回そう。PDCAを継続するとキャラクターガチャが引ける習慣化アプリ。',
        lang: 'ja',
        start_url: '/',
        display: 'standalone',
        // src/index.css の --color-background と同値に保つこと
        // (manifest は CSS 変数を参照できないため hex で二重管理になる)。
        background_color: '#fafaf9',
        theme_color: '#fafaf9',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
