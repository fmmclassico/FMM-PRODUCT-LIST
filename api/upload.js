import { put, putImage } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import { isAdminAuthenticated } from '../lib/admin-auth.js';
const TOKEN=process.env.BLOB_READ_WRITE_TOKEN;
const TYPES=new Set(['image/jpeg','image/png','image/webp','image/gif']);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed.'});}
 if(!isAdminAuthenticated(req))return res.status(401).json({error:'Admin login required.'});
 if(!TOKEN)return res.status(503).json({error:'Image storage is not connected.'});
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const m=typeof body?.data==='string'&&body.data.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
  if(!m)return res.status(400).json({error:'Upload a valid JPG, PNG, WebP or GIF image.'});
  const type=body.mimeType||m[1];if(!TYPES.has(type)||type!==m[1])return res.status(415).json({error:'Unsupported image format.'});
  const bytes=Buffer.from(m[2],'base64');if(!bytes.length||bytes.length>3000000)return res.status(413).json({error:'Image must be 3 MB or smaller after optimisation.'});
  const name=String(body.name||'image').replace(/[^a-zA-Z0-9._-]/g,'-').slice(-70);
  const id=randomUUID();
  let blob;
  if(type==='image/gif'){
   blob=await put('fmm-classico/media/'+id+'-'+name+'.gif',bytes,{access:'public',addRandomSuffix:false,contentType:type,token:TOKEN});
  }else{
   blob=await putImage('fmm-classico/media/'+id+'-'+name+'.webp',bytes,{access:'public',addRandomSuffix:false,token:TOKEN,optimizeImage:{width:1600,quality:76,format:'webp'}});
  }
  return res.status(200).json({success:true,url:blob.url,size:bytes.length,optimized:true});
 }catch(e){console.error('image upload',e);return res.status(500).json({error:'Image upload failed.'});}
}
