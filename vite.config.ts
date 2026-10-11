import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'TOOLSAPI_');
  return { plugins: [react()], server: { proxy: { '/api': { target: env.TOOLSAPI_DEV_ORIGIN || 'http://localhost:8000', changeOrigin: true } } } };
});
