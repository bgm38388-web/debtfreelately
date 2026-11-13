const infoHost = process.env.AD_PUBLIC_ORIGIN
  ? new URL(process.env.AD_PUBLIC_ORIGIN).host
  : 'debtfreelately-info.vercel.app';

export default {
  poweredByHeader: false,
  serverExternalPackages: ['@libsql/client', 'sharp'],
  outputFileTracingIncludes: {
    '/**': ['./dist/*.html'],
    '/api/**': ['./dist/**'],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {source: '/:path*', has: [{type: 'host', value: infoHost}], destination: '/api/__info/:path*'},
        {source: '/ads-preview', destination: '/api/__ads-preview'},
      ],
    };
  },
  async redirects() {
    return [{
      source: '/index.html',
      missing: [{type: 'host', value: infoHost}],
      destination: '/',
      permanent: true,
    }];
  },
  async headers() {
    return [
      {source: '/:path*', headers: [
        {key: 'X-Content-Type-Options', value: 'nosniff'},
        {key: 'Referrer-Policy', value: 'same-origin'},
      ]},
      {source: '/((?!ads-preview$).*)', headers: [{key: 'X-Frame-Options', value: 'DENY'}]},
    ];
  },
};
