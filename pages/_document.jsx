import Document, {Head, Html, Main, NextScript} from 'next/document';

export default class DebtFreeDocument extends Document {
  static async getInitialProps(context) {
    const props = await Document.getInitialProps(context);
    return {...props, legacy: context.req?.debtFreePage};
  }

  render() {
    const page = this.props.legacy;
    return (
      <Html lang="en">
        <Head>
          {page && <>
            <title>{page.title}</title>
            <meta name="theme-color" content="#f8f6ee" />
            {page.links.map(link => <link key={link.href} {...link} />)}
            {page.publisher && <meta name="google-adsense-account" content={page.publisher} />}
            {page.canonical && <>
              <link rel="canonical" href={page.canonical} />
              <meta name="description" content={page.description} />
              <meta property="og:type" content="website" />
              <meta property="og:title" content={page.title} />
              <meta property="og:description" content={page.description} />
              <meta property="og:url" content={page.canonical} />
            </>}
            <link rel="stylesheet" href="/next-legacy.css" />
          </>}
        </Head>
        <body className={page?.bodyClass} data-ad-page={page?.adPage}
          data-management={page?.management} data-public-language={page?.publicLanguage ? '' : undefined}>
          {page && <div id="legacy-page" dangerouslySetInnerHTML={{__html: page.markup}} />}
          <Main />
          <NextScript />
          {page?.scripts.map(src => <script key={src} type="module" src={src} />)}
        </body>
      </Html>
    );
  }
}
