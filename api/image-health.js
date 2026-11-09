import { list, put } from '@vercel/blob';

const TOKEN=process.env.BLOB_READ_WRITE_TOKEN;
const CATALOGUE_PATH='fmm-classico/catalogue.json';

async function probe(url){
  try{
    let r=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(10000),cache:'no-store'});
    if(r.status===405||r.status===403){
      r=await fetch(url,{method:'GET',headers:{Range:'bytes=0-0'},signal:AbortSignal.timeout(10000),cache:'no-store'});
    }
    const type=r.headers.get('content-type')||'';
    return {ok:r.ok&&(type.startsWith('image/')||r.status===206),status:r.status,contentType:type};
  }catch(e){return {ok:false,status:0,error:e.name==='TimeoutError'?'timeout':'network error'};}
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed.'});}
  if(!TOKEN)return res.status(503).json({error:'Blob storage is not connected.'});
  try{
    const {blobs=[]}=await list({prefix:'',token:TOKEN});
    const catalogueBlob=blobs.find(x=>x.pathname===CATALOGUE_PATH);
    if(!catalogueBlob)return res.status(404).json({error:'Saved catalogue was not found.'});
    const response=await fetch(catalogueBlob.url,{cache:'no-store'});
    if(!response.ok)throw new Error('Could not read saved catalogue.');
    const data=await response.json();
    const refs=[];
    for(const p of data.products||[]){
      const urls=Array.isArray(p.images)?p.images.filter(Boolean):(p.image?[p.image]:[]);
      urls.forEach((url,index)=>refs.push({kind:'product',name:p.name||'Unnamed product',id:p.id,index,url}));
    }
    for(const b of data.banners||[])if(b.image)refs.push({kind:'banner',name:b.title||b.id||'Banner',url:b.image});
    const unique=[...new Map(refs.map(x=>[x.url,x])).values()];
    const results=[];
    for(let i=0;i<unique.length;i+=6){
      const batch=await Promise.all(unique.slice(i,i+6).map(async item=>{
        const result=await probe(item.url);
        return {...item,...result};
      }));
      results.push(...batch);
    }
    const broken=results.filter(x=>!x.ok);
    return res.status(200).json({
      checkedAt:new Date().toISOString(),
      productCount:(data.products||[]).length,
      bannerCount:(data.banners||[]).length,
      imageReferences:refs.length,
      uniqueImages:unique.length,
      healthy:results.filter(x=>x.ok).length,
      broken:broken.length,
      brokenImages:broken
    });
  }catch(e){
    console.error('image health check',e);
    return res.status(500).json({error:'Could not complete the image health check.'});
  }
}
