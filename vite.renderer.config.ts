import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config
export default defineConfig(async () => {
  const tailwindcss = (await new Function(`return import('@tailwindcss/vite')`)()).default;
  return {
    plugins: [react(), tailwindcss()],
  };
});
