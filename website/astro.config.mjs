// @ts-check
import { defineConfig } from 'astro/config';

/** StoatMD 官网 · Cloudflare Pages 静态输出 */
export default defineConfig({
  site: 'https://stoatmd.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-hans', 'zh-hant', 'ja', 'ko', 'de', 'fr', 'es'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    build: {
      // 织线动画为独立 vendor，勿被打包进页面 chunk
      assetsInlineLimit: 0,
    },
  },
});
