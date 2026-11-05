import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {timingSafeEqual} from 'node:crypto';

const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const error=(message,status=400)=>Object.assign(Error(message),{status});
const cookieToken=req=>(req.headers.cookie||'').split(';').map(item=>item.trim()).find(item=>item.startsWith('dfl_session='))?.slice(12);
async function bytes(req,max){
 if(req.body!==undefined){const raw=Buffer.isBuffer(req.body)?req.body:Buffer.from(typeof req.body==='string'?req.body:JSON.stringify(req.body));if(raw.length>max)throw error('Dữ liệu vượt dung lượng cho phép.',413);return raw;}
 const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max)throw error('Dữ liệu vượt dung lượng cho phép.',413);chunks.push(chunk);}return Buffer.concat(chunks);
}
export function createAdvertisingRoutes({auth,moderation,advertising,adStorage,origin,env=process.env}){
 const canonicalOrigin=env.CANONICAL_APP_ORIGIN||env.APP_ORIGIN||(env.VERCEL_PROJECT_PRODUCTION_URL?'https://'+env.VERCEL_PROJECT_PRODUCTION_URL:origin);
 const publicOrigin=env.AD_PUBLIC_ORIGIN||'';
 const publicHost=publicOrigin&&new URL(publicOrigin).host===new URL(origin).host;
 async function admin(req){const user=await auth.session(cookieToken(req));if(!user)throw error('Vui lòng đăng nhập bằng tài khoản quản trị.',401);if(!await moderation.isAdmin(user))throw error('Chỉ quản trị viên được quản lý quảng cáo.',403);return user;}
 async function mutation(req){if(req.method!=='POST')throw error('Phương thức không được hỗ trợ.',405);if(req.headers.origin!==origin)throw error('Yêu cầu không hợp lệ.',403);const ip=env.VERCEL?(req.headers['x-vercel-forwarded-for']||req.socket.remoteAddress):req.socket.remoteAddress;if(!await auth.allowRequest('ads:'+ip,{maximum:3000}))throw error('Quá nhiều yêu cầu. Vui lòng thử lại sau.',429);}
 async function input(req,max=500000){if(!String(req.headers['content-type']).startsWith('application/json'))throw error('Yêu cầu JSON không hợp lệ.',415);let value;try{value=JSON.parse((await bytes(req,max)).toString('utf8'));}catch(err){if(err.status)throw err;throw error('Dữ liệu JSON không hợp lệ.');}if(!value||typeof value!=='object'||Array.isArray(value))throw error('Dữ liệu không hợp lệ.');return value;}
 async function config(){const snapshot=advertising.publicConfig?await advertising.publicConfig():await advertising.snapshot();const live=snapshot.settings?.live||snapshot.settings||{};const keys=['enabled','directEnabled','adsenseEnabled','defaultSource','rotationSeconds','desktopEnabled','mobileEnabled','frequencyCap','publisherId','googleApproved','consentConfigured','fallbackEnabled','unitMapping'];const settings=Object.fromEntries(keys.filter(key=>live[key]!==undefined).map(key=>[key,live[key]]));settings.canonicalOrigin=canonicalOrigin;settings.publicOrigin=publicOrigin||live.publicOrigin||'';return {settings,zones:snapshot.zones||[],placements:snapshot.placements?.live?.zones||snapshot.zones||[],activeCampaignIds:snapshot.activeCampaignIds||[],revision:snapshot.revision??snapshot.placements?.live?.revision??0,canonicalOrigin};}
 return async function advertisingRoute(req,res){
  const url=new URL(req.url,origin),pathname=url.pathname;
  if(publicHost&&!pathname.startsWith('/api/ads/')){
   if(pathname.startsWith('/api/')){json(res,404,{error:'Không tìm thấy.'});return true;}
   if(pathname==='/ads.txt'){const publisher=(await config()).settings.publisherId;res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(/^ca-pub-\d{16}$/.test(publisher||'')?'google.com, '+publisher.slice(3)+', DIRECT, f08c47fec0942fa0\n':'');return true;}
   const info=['/privacy.html','/transparency.html','/community-safety.html','/about.html'];
   const modules=['/public-entry.mjs','/public-layout.mjs','/how-it-works.mjs','/advertising-public.mjs','/advertising-consent.mjs'];
   const styles=['style','brand','welcome','how-it-works','discover-design','debt-card','advertising','privacy','about','transparency'].map(name=>'/'+name+'.css');
   let file=pathname==='/'||pathname==='/index.html'||pathname==='/public.html'?'/public.html':pathname;
   if(!['/public.html',...info,...modules,...styles].includes(file)&&!/^\/assets\/[\w.-]+\.(png|jpg|webp|svg)$/.test(file)){res.writeHead(308,{Location:new URL(canonicalOrigin).origin+pathname+url.search,'Cache-Control':'no-store'});res.end();return true;}
   try{let content=await readFile(path.resolve(import.meta.dirname,'dist','.'+file));if(file==='/public.html'){const publisher=(await config()).settings.publisherId;if(/^ca-pub-\d{16}$/.test(publisher||''))content=Buffer.from(content.toString().replace('</head>','<meta name="google-adsense-account" content="'+publisher+'"></head>'));}const ext=file.split('.').at(-1);res.writeHead(200,{'Content-Type':({html:'text/html; charset=utf-8',mjs:'text/javascript',css:'text/css',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',webp:'image/webp'})[ext]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);}catch{json(res,404,{error:'Không tìm thấy.'});}return true;
  }
  if(!advertising)return false;
  const managed=pathname==='/ads-preview'||pathname==='/api/admin/ads'||pathname.startsWith('/api/admin/ads/');
  const publicRoute=pathname.startsWith('/api/ads/');
  if(!managed&&!publicRoute)return false;
  try{
   if(managed){
    const user=await admin(req);
    if(pathname==='/ads-preview'&&req.method==='GET'){const page=await readFile(path.resolve(import.meta.dirname,'dist/ads-preview.html'));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':"frame-ancestors 'self'; object-src 'none'"});res.end(page);return true;}
    if(pathname==='/api/admin/ads'&&req.method==='GET'){json(res,200,await advertising.snapshot(Object.fromEntries(['from','to','campaignId','zone','device'].map(key=>[key,url.searchParams.get(key)||undefined]))));return true;}
    if(pathname==='/api/admin/ads/preview'&&req.method==='GET'){json(res,200,{allowed:true,config:await advertising.snapshot()});return true;}
    await mutation(req);
    if(pathname==='/api/admin/ads/action'){
     const {action,payload}=await input(req,1500000);
     if(typeof action!=='string'||!payload||typeof payload!=='object'||Array.isArray(payload))throw error('Thao tác quảng cáo không hợp lệ.');
     if(action==='settings.save'&&payload.publicOrigin){let candidate;try{candidate=new URL(payload.publicOrigin).origin;}catch{throw error('Địa chỉ công khai không hợp lệ.');}if(!publicOrigin||candidate!==new URL(publicOrigin).origin||candidate===new URL(canonicalOrigin).origin)throw error('AdSense chỉ dùng địa chỉ công khai tách biệt đã cấu hình.');}
     json(res,200,await advertising.action(action,payload,user.id));return true;
    }
    if(pathname==='/api/admin/ads/creative'){
     if(!adStorage)throw error('Kho banner chưa được cấu hình.',503);
     const buffer=await bytes(req,2*1024*1024),mime=String(req.headers['content-type']||'').split(';')[0];let filename,alt;
     try{filename=decodeURIComponent(String(req.headers['x-file-name']||'banner'));alt=decodeURIComponent(String(req.headers['x-image-alt']||''));}catch{throw error('Tên ảnh không hợp lệ.');}
     const metadata=await adStorage.upload(buffer,{mime,filename,alt});
     try{json(res,201,{creative:await advertising.registerCreative(metadata,user.id)});}catch(err){await adStorage.remove(metadata).catch(()=>{});throw err;}return true;
    }
    throw error('Không tìm thấy thao tác.',404);
   }
   if(pathname==='/api/ads/config'&&req.method==='GET'){json(res,200,await config());return true;}
   if(pathname==='/api/ads/cleanup'&&req.method==='GET'){
    const expected=env.CRON_SECRET||'',provided=String(req.headers.authorization||'').replace(/^Bearer /,'');
    if(!expected||Buffer.byteLength(provided)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(provided),Buffer.from(expected)))throw error('Không được phép.',401);
    if(publicHost)throw error('Không tìm thấy.',404);json(res,200,await advertising.cleanup());return true;
   }
   if(/^\/api\/ads\/media\/[\w-]+$/.test(pathname)&&req.method==='GET'){
    const preview=url.searchParams.get('preview')==='1';if(preview&&publicHost)throw error('Không tìm thấy.',404);if(preview)await admin(req);
    const creative=await advertising.creative(pathname.split('/').at(-1),{admin:preview});if(!creative||!adStorage)throw error('Không tìm thấy ảnh.',404);
    const rawWidth=Number(url.searchParams.get('width')||640),width=[320,640,1280,1920].find(size=>size>=rawWidth)||1920;
    const file=await adStorage.read(creative,width);res.writeHead(200,{'Content-Type':file.contentType,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(file.buffer);return true;
   }
   if(pathname==='/api/ads/click'&&req.method==='GET'){
    const token=url.searchParams.get('token');if(!token||token.length>200)throw error('Liên kết quảng cáo không hợp lệ.',404);
    const bot=/bot|crawler|spider|headless|preview|facebookexternalhit|slurp/i.test(String(req.headers['user-agent']||''));const result=await advertising.click(token,{count:!bot});if(!result?.url)throw error('Quảng cáo không còn khả dụng.',410);
    res.writeHead(302,{Location:result.url,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end();return true;
   }
   if(pathname==='/api/ads/delivery'||pathname==='/api/ads/impression'){
    await mutation(req);const data=await input(req,8192);
    if(pathname.endsWith('impression')){if(typeof data.token!=='string'||data.token.length>200)throw error('Mã hiển thị không hợp lệ.');json(res,200,await advertising.impression(data.token));return true;}
    if(Object.keys(data).some(key=>!['page','device','zone','seen'].includes(key)))throw error('Không chấp nhận dữ liệu nhắm mục tiêu cá nhân.');
    if(!['home','explore','community','how-it-works','info'].includes(data.page)||!['desktop','mobile'].includes(data.device)||typeof data.zone!=='string'||data.zone.length>60)throw error('Vị trí quảng cáo không hợp lệ.');
    if(data.seen!==undefined&&(!data.seen||typeof data.seen!=='object'||Array.isArray(data.seen)||Object.keys(data.seen).length>100||Object.values(data.seen).some(n=>!Number.isInteger(n)||n<0||n>10000)))throw error('Giới hạn tần suất không hợp lệ.');
    const safe=await config(),googleAllowed=Boolean(publicHost&&safe.settings.adsenseEnabled&&safe.settings.googleApproved&&safe.settings.consentConfigured);
    const result=await advertising.deliver(data,{googleAllowed});
    if(result.ad?.source==='direct'){const ad=result.ad;ad.imageUrl='/api/ads/media/'+encodeURIComponent(ad.creativeId);ad.clickUrl='/api/ads/click?token='+encodeURIComponent(ad.token);}
    json(res,200,result);return true;
   }
   throw error('Không tìm thấy.',404);
  }catch(err){json(res,err.status||400,{error:err.status||err instanceof SyntaxError?err.message:'Không thể xử lý quảng cáo. Vui lòng thử lại.'});return true;}
 };
}
