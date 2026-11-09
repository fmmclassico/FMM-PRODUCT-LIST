import { list, put } from '@vercel/blob';
import { isAdminAuthenticated } from './_auth.js';
const TOKEN=process.env.BLOB_READ_WRITE_TOKEN;
const PATH='fmm-classico/catalogue.json';
const DEFAULTS={
 "brand":"FMM CLASSICO","tagline":"PHONE ACCESSORIES • QUALITY • AFFORDABILITY","edition":"FMM CLASSICO PHONE ACCESSORIES",
 "heroTitle":"DISCOVER OUR PHONE ACCESSORIES","heroText":"Our latest phone accessories. Quality products at affordable prices.",
 "catalogueTitle":"Our Phone Accessories","catalogueIntro":"Browse our catalogue and order directly on WhatsApp.",
 "footerTitle":"FMM CLASSICO","footerSlogan":"QUALITY PRODUCTS. AFFORDABLE PRICES.","whatsapp":"233599676419",
 "location":"","social":"","shareTitle":"FMM CLASSICO | Phone Accessories",
 "shareDescription":"Discover quality phone accessories at affordable prices. Browse the catalogue and order directly on WhatsApp.",
 "shareImageUrl":"","banners":[{"id":"default-banner","title":"DISCOVER OUR PHONE ACCESSORIES","text":"Our latest phone accessories. Quality products at affordable prices.","image":"fmm_phone_accessories_banner.jpg"}],"products":[]
};
async function readCatalogue(){
 if(!TOKEN)return null;
 const {blobs=[]}=await list({prefix:'',token:TOKEN});
 const found=blobs.find(x=>x.pathname===PATH)||blobs.find(x=>/catalogue.*\.json$/i.test(x.pathname));
 if(!found)return null;
 const r=await fetch(found.url,{cache:'no-store'});if(!r.ok)throw Error('Could not read stored catalogue');
 const data=await r.json();
 if(!data||!Array.isArray(data.banners)||!Array.isArray(data.products))throw Error('Stored catalogue format is invalid');
 for(const b of data.banners){
  if(typeof b.image==='string'&&!/^https?:\/\//i.test(b.image)&&!b.image.startsWith('data:')){
   const match=blobs.find(x=>x.pathname.split('/').pop()===b.image.split('/').pop()&&x.contentType?.startsWith('image/'));
   if(match)b.image=match.url;else b.image='';
  }
 }
 return data;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method==='GET'){
  try{
   const stored=await readCatalogue();
   if(stored)return res.status(200).json(stored);
   const value=structuredClone(DEFAULTS);
   if(TOKEN){const {blobs=[]}=await list({prefix:'',token:TOKEN});const img=blobs.find(x=>x.pathname.split('/').pop()==='fmm_phone_accessories_banner.jpg'&&x.contentType?.startsWith('image/'))||blobs.find(x=>x.contentType?.startsWith('image/'));if(img)value.banners[0].image=img.url;else value.banners[0].image='';}
   return res.status(200).json(value);
  }catch(e){console.error('catalogue GET',e);return res.status(500).json({error:'Could not load the saved catalogue.'});}
 }
 if(!['PUT','POST'].includes(req.method)){res.setHeader('Allow','GET, PUT, POST, OPTIONS');return res.status(405).json({error:'Method not allowed.'});}
 if(!isAdminAuthenticated(req))return res.status(401).json({error:'Admin login required.'});
 if(!TOKEN)return res.status(503).json({error:'Blob storage is not connected.'});
 try{
  const value=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(!value||typeof value!=='object'||Array.isArray(value)||!Array.isArray(value.banners)||!Array.isArray(value.products))return res.status(400).json({error:'Invalid catalogue data.'});
  const payload=JSON.stringify({...value,updatedAt:new Date().toISOString()});
  if(Buffer.byteLength(payload)>3500000)return res.status(413).json({error:'Catalogue too large. Upload images separately.'});
  const blob=await put(PATH,payload,{access:'public',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json; charset=utf-8',token:TOKEN});
  return res.status(200).json({success:true,url:blob.url});
 }catch(e){console.error('catalogue PUT',e);return res.status(500).json({error:'Could not save the catalogue.'});}
}
