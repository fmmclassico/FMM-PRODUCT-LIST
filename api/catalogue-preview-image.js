import { ImageResponse } from '@vercel/og';
import React from 'react';
import { list } from '@vercel/blob';
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const PATH = 'fmm-classico/catalogue.json';
const h = React.createElement;
async function img(url) {
  if (!url || !/^https:\/\//i.test(url)) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) return null;
    const type = r.headers.get('content-type') || 'image/jpeg';
    if (!type.startsWith('image/')) return null;
    const b = Buffer.from(await r.arrayBuffer());
    if (!b.length || b.length > 4000000) return null;
    return 'data:' + type + ';base64,' + b.toString('base64');
  } catch { return null; }
}
export async function GET(request) {
  try {
    if (!TOKEN) return new Response('Image storage is not connected.', { status:503 });
    const { blobs = [] } = await list({ prefix:'', token:TOKEN });
    const file = blobs.find(x => x.pathname === PATH) || blobs.find(x => /catalogue.*\.json$/i.test(x.pathname));
    if (!file) return new Response('Catalogue not found.', { status:404 });
    const r = await fetch(file.url, { cache:'no-store', signal:AbortSignal.timeout(12000) });
    if (!r.ok) return new Response('Could not read catalogue.', { status:502 });
    const data = await r.json();
    const banner = data.banners?.find(x => x.image)?.image || '';
    const products = (data.products || []).filter(x => x.visible !== false).slice(0,2);
    const [bannerSrc, firstSrc, secondSrc] = await Promise.all([
      img(banner), img(products[0]?.images?.[0] || products[0]?.image), img(products[1]?.images?.[0] || products[1]?.image)
    ]);
    const card = (p, src) => h('div',{style:{display:'flex',flexDirection:'row',alignItems:'center',gap:12,background:'#f1f8fc',border:'2px solid #d5e5ed',borderRadius:16,padding:10,width:390,height:174}},
      src?h('img',{src,style:{width:130,height:148,objectFit:'contain',background:'#fff',borderRadius:10}}):h('div',{style:{width:130,height:148,background:'#eaf5fb',borderRadius:10}}),
      h('div',{style:{display:'flex',flexDirection:'column',flex:1}},
        h('div',{style:{fontSize:22,fontWeight:800,color:'#073451',lineHeight:1.2}},String(p?.name||'Featured accessory').trim()),
        h('div',{style:{marginTop:10,color:'#0878b9',fontSize:24,fontWeight:800}},p?.price?'GH₵ '+String(p.price).trim():'Available now')));
    const node=h('div',{style:{width:'100%',height:'100%',display:'flex',flexDirection:'row',background:'#fff',padding:26,gap:22,borderTop:'14px solid #0878b9'}},
      h('div',{style:{width:680,display:'flex',flexDirection:'column',gap:12}},
        h('div',{style:{color:'#073451',fontSize:34,fontWeight:900,letterSpacing:1}},'FMM CLASSICO'),
        h('div',{style:{color:'#637783',fontSize:16,fontWeight:700,letterSpacing:1}},'YOUR TRUSTED DESTINATION FOR QUALITY PRODUCTS'),
        bannerSrc?h('img',{src:bannerSrc,style:{width:660,height:470,objectFit:'contain',borderRadius:14,background:'#eaf5fb'}}):h('div',{style:{width:660,height:470,background:'#eaf5fb',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,color:'#0878b9'}},'PHONE ACCESSORIES')),
      h('div',{style:{width:410,display:'flex',flexDirection:'column',justifyContent:'center',gap:16}},
        h('div',{style:{fontSize:26,fontWeight:900,color:'#073451'}},'FEATURED PICKS'),
        card(products[0],firstSrc),card(products[1],secondSrc),
        h('div',{style:{fontSize:18,fontWeight:800,color:'#0878b9'}},'BROWSE THE FULL CATALOGUE')));
    return new ImageResponse(node,{width:1200,height:630});
  } catch(e) {
    console.error('catalogue preview image',e);
    return new Response('Could not prepare catalogue preview image.',{status:500});
  }
}
