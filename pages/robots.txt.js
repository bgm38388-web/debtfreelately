import {siteOrigin} from '../web/site.mjs';

export function getServerSideProps({res}) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(`User-agent: *
Allow: /
Disallow: /api/
Sitemap: ${siteOrigin}/sitemap.xml
`);
  return {props: {}};
}

export default function Robots() { return null; }
