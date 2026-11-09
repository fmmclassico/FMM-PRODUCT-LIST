import { handleUpload } from '@vercel/blob/client';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed.'});}
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const result=await handleUpload({
   body,request:req,
   onBeforeGenerateToken:async(pathname,clientPayload)=>{
    let meta={};try{meta=JSON.parse(clientPayload||'{}')}catch{}
    const video=meta.kind==='product-video';
    return {
     allowedContentTypes:video?['video/mp4','video/webm']:['image/webp','image/jpeg','image/png'],
     maximumSizeInBytes:video?52428800:5000000,
     addRandomSuffix:true,
     cacheControlMaxAge:60*60*24*30
    };
   },
   onUploadCompleted:async({blob})=>{console.log('Media upload completed:',blob.pathname,blob.size)}
  });
  return res.status(200).json(result);
 }catch(e){console.error('client media upload',e);return res.status(400).json({error:e.message||'Upload token request failed.'});}
}