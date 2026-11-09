import { list } from '@vercel/blob';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const CATALOGUE_PATH = 'fmm-classico/catalogue.json';
const SITE = 'https://fmmclassicoproduct.vercel.app';
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

function isSocialCrawler(userAgent = '') {
  return /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Pinterest|SkypeUriPreview|Google-InspectionTool/i.test(userAgent);
}

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
    const data = await response.json();
    const title = data.shareTitle || data.brand || 'FMM CLASSICO | Phone Accessories';
    const description = String(data.shareDescription || data.catalogueIntro || 'Browse quality phone accessories at affordable prices.').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
    const imageCandidate = data.shareImageUrl || data.banners?.find((banner) => banner.image)?.image || '';
    let image = /^https:\/\//i.test(imageCandidate) ? imageCandidate : '';
    if (!image && imageCandidate) {
      const match = blobs.find((item) => item.pathname.split('/').pop() === imageCandidate.split('/').pop() && item.contentType?.startsWith('image/'));
      if (match) image = match.url;
    }
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}/">
<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(data.brand || 'FMM CLASSICO')}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${SITE}/"><meta property="og:locale" content="en_GH">
${image ? `<meta property="og:image" content="${esc(image)}"><meta property="og:image:secure_url" content="${esc(image)}"><meta property="og:image:alt" content="${esc(title)}"><meta name="twitter:image" content="${esc(image)}">` : ''}
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}">
</head><body><h1>${esc(title)}</h1><p>${esc(description)}</p><a href="${SITE}/">Open FMM CLASSICO catalogue</a><script>window.location.replace('/');</script></body></html>`);
  } catch (error) {
    console.error('catalogue share preview', error);
    return res.status(500).send('Could not prepare the catalogue preview.');
  }
}
