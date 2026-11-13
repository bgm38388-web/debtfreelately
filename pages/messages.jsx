import {getServerSideProps as renderPage} from '../web/render-page.mjs';

export async function getServerSideProps(context) {
  return renderPage(context);
}

export default function Page() { return null; }
