import { createHmac, timingSafeEqual } from 'node:crypto';
const COOKIE='fmm_admin_session';
const MAX_AGE=12*60*60;
function signature(timestamp){return createHmac('sha256',process.env.FMM_SESSION_SECRET||'').update(String(timestamp)).digest('hex')}
function safeEqual(a,b){const x=Buffer.from(String(a||''));const y=Buffer.from(String(b||''));return x.length===y.length&&timingSafeEqual(x,y)}
export function isAdminAuthenticated(req){
 const secret=process.env.FMM_SESSION_SECRET;if(!secret)return false;
 const raw=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
 if(!raw)return false;
 const value=decodeURIComponent(raw.slice(COOKIE.length+1));const [timestamp,sig]=value.split('.');
 if(!timestamp||!sig||!/^\d+$/.test(timestamp))return false;
 const age=Math.floor(Date.now()/1000)-Number(timestamp);
 return age>=0&&age<=MAX_AGE&&safeEqual(sig,signature(timestamp));
}
export function setAdminCookie(res){
 const timestamp=Math.floor(Date.now()/1000);
 const value=encodeURIComponent(timestamp+'.'+signature(timestamp));
 res.setHeader('Set-Cookie',COOKIE+'='+value+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age='+MAX_AGE);
}
export function clearAdminCookie(res){res.setHeader('Set-Cookie',COOKIE+'=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0')}
