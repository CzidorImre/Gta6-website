import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const site = process.env.SITE_URL ?? 'https://wantedlevel.be';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/*/admin', '/*/account', '/*/report', '/*/auth/', '/auth/', '/api/'],
      },
    ],
    host: site,
  };
}
