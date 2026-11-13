import {publicPages, siteOrigin} from '../web/site.mjs';

export function getServerSideProps({res}) {
  const urls = Object.keys(publicPages).map(path => `  <url><loc>${new URL(path, siteOrigin)}</loc></url>`);
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.end(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`);
  return {props: {}};
}

export default function Sitemap() { return null; }
