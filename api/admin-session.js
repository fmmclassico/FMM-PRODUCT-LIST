import { timingSafeEqual } from 'node:crypto';
import { isAdminAuthenticated, setAdminCookie, clearAdminCookie } from './_auth.js';
function equal(a,b){const x=Buffer.from(String(a||''));const y=Buffer.from(String(b||''));return x.length===y.length&&timingSafeEqual(x,y)}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method==='GET')return res.status(200).json({authenticated:isAdminAuthenticated(req)});
 if(req.method==='DELETE'){clearAdminCookie(res);return res.status(200).json({success:true})}
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST, DELETE');return res.status(405).json({error:'Method not allowed.'})}
 const expected=process.env.FMM_ADMIN_PASSWORD;
 if(!expected)return res.status(503).json({error:'Admin password is not configured.'});
 const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
 if(!equal(body.password,expected))return res.status(401).json({error:'Incorrect password. Please try again.'});
 if(!process.env.FMM_SESSION_SECRET)return res.status(503).json({error:'Admin session security is not configured.'});
 setAdminCookie(res);return res.status(200).json({success:true});
}
