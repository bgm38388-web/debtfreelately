export const siteOrigin = new URL(process.env.SITE_ORIGIN || 'https://debtfreelately.com').origin;

export const publicPages = {
  '/': ['index.html', 'Create a debt card, share your story on your terms, and connect with people who may be able to help.'],
  '/about.html': ['about.html', 'Learn why DebtFreeLately connects people facing debt with a community willing to help.'],
  '/privacy.html': ['privacy.html', 'See how DebtFreeLately handles information and how you can choose what to share on your debt card.'],
  '/transparency.html': ['transparency.html', 'Learn how review, pledges and transparency work on DebtFreeLately.'],
  '/community-safety.html': ['community-safety.html', 'Learn how DebtFreeLately approaches community safety, reporting and responsible participation.'],
};

export const privatePages = {
  ...Object.fromEntries(Object.values(appPaths).filter(path => path !== '/').map(path => [path, ['index.html']])),
  '/admin': ['admin.html'],
  '/admin.html': ['admin.html'],
  '/my-cards': ['my-cards.html'],
  '/my-cards.html': ['my-cards.html'],
  '/public.html': ['public.html'],
  '/terms.html': ['terms.html'],
};
import {appPaths} from '../dist/app-routes.mjs';

