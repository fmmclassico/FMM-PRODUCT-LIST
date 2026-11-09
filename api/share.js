import { list } from '@vercel/blob';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const CATALOGUE_PATH = 'fmm-classico/catalogue.json';
const SITE = 'https://products.fmmclassico.com';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const slugify = (value) => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function cleanDescription(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
}

async function getCatalogue() {
  if (!TOKEN) throw new Error('Catalogue storage is not connected.');
  const { blobs = [] } = await list({ prefix: '', token: TOKEN });
  const file = blobs.find((item) => item.pathname === CATALOGUE_PATH)
    || blobs.find((item) => /catalogue.*\.json$/i.test(item.pathname));
  if (!file) throw new Error('Catalogue not found.');
  const response = await fetch(file.url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Could not read catalogue.');
  return { data: await response.json(), blobs };
}

function getProductImage(product, catalogue, blobs) {
  const candidates = [
    ...(Array.isArray(product.images) ? product.images : []),
    product.image,
    product.media?.[0]?.data,
    catalogue.shareImageUrl,
    catalogue.banners?.[0]?.image
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate) continue;
    if (/^https:\/\//i.test(candidate)) return candidate;
    if (/^data:/i.test(candidate)) continue;
    const match = blobs.find((item) =>
      item.pathname.split('/').pop() === candidate.split('/').pop()
      && item.contentType?.startsWith('image/')
    );
    if (match) return match.url;
  }
  return '';
}

function isSocialCrawler(userAgent = '') {
  return /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Pinterest|SkypeUriPreview|Google-InspectionTool/i.test(userAgent);
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'User-Agent');
  const url = new URL(req.url || '/', SITE);
  const id = String(req.query?.id || url.searchParams.get('id') || '').slice(0, 160);
  const slug = String(req.query?.slug || url.searchParams.get('slug') || '').slice(0, 180);
  if (!id && !slug) return res.status(400).send('A product name is required.');

  try {
    const { data, blobs } = await getCatalogue();
    const product = (data.products || []).find((item) => item.visible !== false && (id ? String(item.id) === id : slugify(item.name) === slug));
    if (!product) return res.status(404).send('This product is unavailable.');

    const productSlug = slugify(product.name);
    const productUrl = SITE + '/product/' + encodeURIComponent(product.id);
    const title = (product.name || 'Phone accessory').trim() + ' from ' + (data.brand || 'FMM CLASSICO') + '.';
    const description = cleanDescription(product.shortDescription || product.description || 'View product details and order from FMM CLASSICO.');
    const image = getProductImage(product, data, blobs);
    const price = String(product.price || '').trim();
    const whatsapp = String(data.whatsapp || '233599676419').replace(/\D/g, '');
    const orderText = 'Hello ' + (data.brand || 'FMM CLASSICO') + ', I would like to order ' + (product.name || 'this product') + '. Price: GH₵ ' + price + '.';
    const orderUrl = 'https://wa.me/' + encodeURIComponent(whatsapp) + '?text=' + encodeURIComponent(orderText);

    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const imageTags = image ? `
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(product.name || "FMM CLASSICO product")}">
<meta name="twitter:image" content="${esc(image)}">` : '';
    return res.status(200).send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(productUrl)}">
<meta property="og:type" content="product"><meta property="og:site_name" content="${esc(data.brand || 'FMM CLASSICO')}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(productUrl)}">
<meta property="product:price:amount" content="${esc(price)}"><meta property="product:price:currency" content="GHS">
<meta property="og:locale" content="en_GH">${imageTags}
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}">
</head><body><main><h1>${esc(product.name || 'Phone accessory')}</h1><p>${esc(description)}</p><p>Price: GH₵ ${esc(price)}</p><p><a href="/product.html?id=${encodeURIComponent(product.id)}">View full product details</a></p><p><a href="${esc(orderUrl)}">Order on WhatsApp</a></p></main><script>window.location.replace('/product.html?id=${encodeURIComponent(product.id)}');</script></body></html>`);
  } catch (error) {
    console.error('product share preview', error);
    return res.status(500).send('Could not prepare this product preview.');
  }
}
