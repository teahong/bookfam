import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    // 핵심: Vercel에서 빌드할 때는 '/'를 사용하고, 그 외(GitHub)에는 '/bookfam/'을 사용합니다.
    base: process.env.VERCEL ? '/' : '/bookfam/',
})
