/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // В разработке запросы к API уходят на бекенд
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    // Пояс процесса отличен от пояса владельца (Europe/Moscow) и не зависит
    // от машины: время гостя и владельца в тестах всегда расходится
    env: { TZ: 'Asia/Vladivostok' },
  },
})
