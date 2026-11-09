import { list } from '@vercel/blob';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const CATALOGUE_PATH = 'fmm-classico/catalogue.json';
const SITE = 'https://products.fmmclassico.com';

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'User-Agent');
  try {
    if (!TOKEN) throw new Error('Catalogue storage is not connected.');
    const { blobs = [] } = await list({ prefix: '', token: TOKEN });
    const file = blobs.find((item) => item.pathname === CATALOGUE_PATH)
      || blobs.find((item) => /catalogue.*\.json$/i.test(item.pathname));
    if (!file) throw new Error('Catalogue not found.');
    const response = await fetch(file.url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not read catalogue.');
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=120, stale-while-revalidate=300');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="canonical" href="${SITE}/catalogue">
<meta property="og:type" content="website">
<meta property="og:site_name" content="FMM CLASSICO">
<meta property="og:url" content="${SITE}/catalogue">
<meta property="og:image" content="${SITE}/api/catalogue-preview-image">
<meta property="og:image:secure_url" content="${SITE}/api/catalogue-preview-image">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="FMM CLASSICO phone accessories promotional catalogue preview">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}/api/catalogue-preview-image">
</head><body><script>window.location.replace('/');</script></body></html>`);
  } catch (error) {
    console.error('catalogue share preview', error);
    return res.status(500).send('Could not prepare the catalogue preview.');
  }
}
