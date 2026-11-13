import {readLegacyPage} from './legacy-page.mjs';
import {privatePages, publicPages, siteOrigin} from './site.mjs';

export async function getServerSideProps({resolvedUrl, req, res}) {
  const pathname = new URL(resolvedUrl, siteOrigin).pathname;
  const indexable = Object.hasOwn(publicPages, pathname);
  const route = indexable ? publicPages[pathname] : Object.hasOwn(privatePages, pathname) && privatePages[pathname];
  if (!route) return {notFound: true};

  const [file, description] = route;
  if (!indexable) res.setHeader('X-Robots-Tag', 'noindex');
  req.debtFreePage = {
    ...await readLegacyPage(file),
    description,
    canonical: indexable ? new URL(pathname, siteOrigin).href : null,
  };
  return {props: {}};
}
