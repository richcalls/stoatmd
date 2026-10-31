import type { APIRoute } from 'astro';
import { LOCALES, absoluteUrl } from '../i18n';

export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString().slice(0, 10);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LOCALES.map((locale) => {
  const loc = absoluteUrl(locale);
  const alternates = LOCALES.map(
    (alt) =>
      `    <xhtml:link rel="alternate" hreflang="${alt === 'zh-hans' ? 'zh-Hans' : alt === 'zh-hant' ? 'zh-Hant' : alt}" href="${absoluteUrl(alt)}" />`,
  ).join('\n');
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
${alternates}
    <xhtml:link rel="alternate" hreflang="x-default" href="${absoluteUrl('en')}" />
  </url>`;
}).join('\n')}
</urlset>
`;
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
