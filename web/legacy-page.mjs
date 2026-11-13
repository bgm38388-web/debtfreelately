import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {welcomeJourneyHTML} from '../dist/welcome-journey.mjs';

export async function readLegacyPage(file) {
  const html = await readFile(path.join(process.cwd(), 'dist', file), 'utf8');
  const [, head] = html.match(/<head>([\s\S]*?)<\/head>/i);
  const [, bodyTag, body] = html.match(/(<body\b[^>]*>)([\s\S]*?)<\/body>/i);
  const [, title] = head.match(/<title\b[^>]*>([^<]*)<\/title>/i);
  const decode = value => value.replaceAll('&amp;', '&');
  const assetPath = value => value.startsWith('/') ? value : '/' + value;
  const scripts = [...html.matchAll(/<script type="module" src="([^"]+)"><\/script>/gi)]
    .map(([, src]) => assetPath(src));
  const links = [...head.matchAll(/<link\s+([^>]+)>/gi)].map(([, tag]) => ({
    rel: tag.match(/\brel="([^"]+)"/i)?.[1],
    href: assetPath(tag.match(/\bhref="([^"]+)"/i)[1]),
  }));
  let markup = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  if (file === 'index.html') {
    const [mark] = markup.match(/<svg class="welcome-mark"[\s\S]*?<\/svg>/);
    markup = markup.replace('<div class="welcome-footer">',
      () => welcomeJourneyHTML(mark.replace('welcome-mark', 'journey-transition-mark')) + '<div class="welcome-footer">');
  }
  return {
    title: decode(title),
    links,
    scripts,
    markup,
    bodyClass: bodyTag.match(/\bclass="([^"]+)"/)?.[1],
    adPage: bodyTag.match(/\bdata-ad-page="([^"]+)"/)?.[1],
    management: bodyTag.match(/\bdata-management="([^"]+)"/)?.[1],
    publicLanguage: bodyTag.includes('data-public-language'),
    publisher: head.match(/name="google-adsense-account" content="([^"]+)"/)?.[1],
  };
}
