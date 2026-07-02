export function loader() {
  const body = ['User-agent: *', 'Disallow: /admin', 'Disallow: /api', '', 'Sitemap: /sitemap.xml', ''].join('\n');
  return new Response(body, { headers: { 'content-type': 'text/plain' } });
}
