import { resolve } from 'node:path';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    fs: {
      // Vite standartlari (deny berilsa ular almashtiriladi) + ilova ma'lumotlari: `DATA_DIR` (baza, WAL,
      // zaxiralar) va har qanday SQLite fayli. Yo'l ildizga bog'langan — `src/data/` ga tegmaydi.
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', `${resolve(process.env.DATA_DIR ?? 'data')}/**`, '*.db', '*.db-*'],
    },
  },
});
