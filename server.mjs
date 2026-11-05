import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createAuth,sendVerification} from './auth.mjs';
import {createModeration} from './moderation.mjs';
import {fraudSignals} from './fraud.mjs';
const root=path.resolve(import.meta.dirname,'dist');
export function createAppServer({auth,moderation,origin='http://127.0.0.1:4173'}){
const secure=new URL(origin).protocol==='https:',limits=new Map();
const cookie=token=>`dfl_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token?86400:0}${secure?'; Secure':''}`;
const token=req=>(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('dfl_session='))?.slice(12);
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
async function body(req,max=8192){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max)throw Error('Yêu cầu quá dài.');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
const server=http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');try{const pathname=decodeURIComponent(new URL(req.url,origin).pathname);if(pathname.startsWith('/api/')){
if(req.method==='GET'&&pathname==='/api/auth/config')return json(res,200,{emailConfigured:Boolean(process.env.RESEND_API_KEY&&process.env.AUTH_FROM_EMAIL)});
if(req.method==='GET'&&pathname==='/api/auth/me'){const user=auth.session(token(req));return json(res,user?200:401,user?{user:{...user,isAdmin:moderation.isAdmin(user)}}:{error:'Vui lòng đăng nhập và xác minh email.'});}
if(req.method==='GET'&&pathname==='/api/cards')return json(res,200,{cards:moderation.publicCards(auth.blockedAccountIds())});
if(req.method==='GET'&&pathname==='/api/notifications'){const user=auth.session(token(req));return user?json(res,200,{notifications:auth.notifications(user.id)}):json(res,401,{error:'Vui lòng đăng nhập.'});}
if(req.method==='GET'&&(pathname==='/api/admin/fraud'||pathname==='/api/admin/users'||/^\/api\/admin\/users\/[^/]+\/history$/.test(pathname))){const user=auth.session(token(req));if(!moderation.isAdmin(user))return json(res,user?403:401,{error:'Chỉ admin mới được truy cập.'});const accounts=auth.memberDirectory();if(pathname==='/api/admin/fraud'){const submissions=moderation.reviewData(user),signals=fraudSignals({accounts,submissions});return json(res,200,{signals:signals.map(s=>({...s,members:s.accountIds.map(id=>accounts.find(a=>a.id===id)).filter(Boolean).map(a=>({id:a.id,name:a.name,email:a.email,blocked:a.blocked}))})),documentAnalysis:'unavailable',checkedAt:new Date().toISOString()});}if(pathname.endsWith('/history'))return json(res,200,{events:auth.safetyHistory(pathname.split('/')[4])});const query=(new URL(req.url,origin).searchParams.get('q')||'').trim().toLocaleLowerCase('vi').slice(0,100);const blockedOnly=new URL(req.url,origin).searchParams.get('blocked')==='1';return json(res,200,{users:accounts.filter(a=>!blockedOnly||a.blocked).filter(a=>[a.name,a.nickname,a.email,a.id].some(value=>String(value||'').toLocaleLowerCase('vi').includes(query))).slice(0,100).map(a=>({...a,protected:moderation.isAdmin({...a,emailVerified:Boolean(a.email)})}))});}
if(req.method==='GET'&&pathname==='/api/cards/mine')return json(res,200,{cards:moderation.mine(auth.session(token(req)))});
if(req.method==='GET'&&pathname==='/api/admin/me'){const user=auth.session(token(req));return json(res,!user?401:moderation.isAdmin(user)?200:403,moderation.isAdmin(user)?{user:{...user,isOwner:moderation.isOwner(user)}}:{error:'Chỉ tài khoản admin đã xác minh mới được truy cập.'});}
if(req.method==='GET'&&pathname==='/api/admin/members')return json(res,200,{members:moderation.adminMembers(auth.session(token(req)))});
if(req.method==='GET'&&pathname==='/api/admin/cards')return json(res,200,{cards:moderation.list(auth.session(token(req)),new URL(req.url,origin).searchParams.get('status')||'pending')});
if(req.method!=='POST')return json(res,404,{error:'Không tìm thấy.'});if(req.headers.origin!==origin||!String(req.headers['content-type']).startsWith('application/json'))return json(res,403,{error:'Yêu cầu không hợp lệ.'});const ip=req.socket.remoteAddress,t=Date.now();for(const [key,value]of limits)if(t-value.since>3600000)limits.delete(key);const l=limits.get(ip)||{since:t,count:0};if(l.count>=40)return json(res,429,{error:'Quá nhiều yêu cầu. Vui lòng thử lại sau.'});l.count++;limits.set(ip,l);
if(pathname==='/api/cards')return json(res,201,{card:moderation.submit(auth.session(token(req)),await body(req,500000))});
if(pathname==='/api/notifications/read'){const user=auth.session(token(req));if(!user)return json(res,401,{error:'Vui lòng đăng nhập.'});return json(res,200,auth.readNotifications(user.id,(await body(req)).ids));}
if(/^\/api\/admin\/users\/[^/]+\/(notify|block)$/.test(pathname)){const user=auth.session(token(req));if(!moderation.isAdmin(user))return json(res,user?403:401,{error:'Chỉ admin mới được xử lý thành viên.'});const id=pathname.split('/')[4],target=auth.memberDirectory().find(a=>a.id===id);if(!target)return json(res,404,{error:'Thành viên không tồn tại.'});const input=await body(req);if(pathname.endsWith('/notify'))return json(res,200,{notification:auth.notify(id,{message:input.message,actor:user.id})});if(id===user.id||(moderation.isAdmin({...target,emailVerified:Boolean(target.email)})&&!(input.blocked===false&&target.blocked)))return json(res,403,{error:'Không thể chặn chính bạn hoặc tài khoản admin. Chủ sở hữu cần thu hồi quyền admin trước.'});return json(res,200,auth.setBlocked(id,{blocked:input.blocked,reason:input.reason,actor:user.id}));}
if(pathname==='/api/admin/members'||pathname==='/api/admin/members/revoke'){const user=auth.session(token(req));if(!moderation.isOwner(user))return json(res,user?403:401,{error:'Chỉ chủ sở hữu mới được quản lý thành viên admin.'});const input=await body(req);return json(res,200,{members:pathname.endsWith('/revoke')?moderation.removeAdmin(user,input.email):moderation.addAdmin(user,input.email)});}
if(/^\/api\/admin\/cards\/[^/]+\/review$/.test(pathname)){const user=auth.session(token(req));if(!moderation.isAdmin(user))return json(res,user?403:401,{error:'Chỉ admin mới được duyệt thẻ.'});return json(res,200,{card:moderation.review(user,pathname.split('/')[4],await body(req))});}
if(pathname==='/api/auth/nickname-signup'||pathname==='/api/auth/nickname-login'){const d=await body(req),result=pathname.endsWith('nickname-signup')?auth.nicknameSignup(d):auth.nicknameLogin(d);res.setHeader('Set-Cookie',cookie(result.token));return json(res,200,{user:result.user});}
if(pathname==='/api/auth/request-code'){if(!process.env.RESEND_API_KEY||!process.env.AUTH_FROM_EMAIL)return json(res,503,{error:'Dịch vụ gửi email chưa được cấu hình. Tài khoản chưa được tạo.'});return json(res,200,await auth.request(await body(req)));}
if(pathname==='/api/auth/verify-code'){const d=await body(req),result=auth.verify(d.id,d.code);res.setHeader('Set-Cookie',cookie(result.token));return json(res,200,{user:result.user});}
if(pathname==='/api/auth/profile'){if(!auth.session(token(req)))return json(res,401,{error:'Vui lòng đăng nhập.'});return json(res,200,{user:auth.updateProfile(token(req),await body(req,750000))});}
if(pathname==='/api/auth/logout'){auth.logout(token(req));res.setHeader('Set-Cookie',cookie(''));return json(res,200,{ok:true});}return json(res,404,{error:'Không tìm thấy.'});}
if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}const routes={'/':'/index.html','/admin':'/admin.html','/my-cards':'/my-cards.html'};const file=path.resolve(root,'.'+(routes[pathname]||pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const data=await readFile(file);res.setHeader('Content-Type',({html:'text/html; charset=utf-8',css:'text/css',mjs:'text/javascript',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg'})[file.split('.').pop()]||'application/octet-stream');res.setHeader('Cache-Control','no-cache');res.end(req.method==='HEAD'?undefined:data);
}catch(error){if(req.url.startsWith('/api/'))json(res,error.status||400,{error:error instanceof SyntaxError?'Dữ liệu không hợp lệ.':error.message});else res.writeHead(404).end('Not found');}});
return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const runtime=path.resolve(import.meta.dirname,'.runtime');await mkdir(runtime,{recursive:true});
 const auth=createAuth({database:path.join(runtime,'accounts.sqlite'),send:sendVerification});
 const moderation=createModeration({database:path.join(runtime,'cards.sqlite'),adminEmails:(process.env.ADMIN_EMAILS||'').split(',')});
 const server=createAppServer({auth,moderation,origin:process.env.APP_ORIGIN||'http://127.0.0.1:4173'});
 server.listen(4173,'127.0.0.1',()=>console.log('http://127.0.0.1:4173'));
 function shutdown(){server.close(()=>{auth.close();moderation.close();process.exit(0);});}process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
}
