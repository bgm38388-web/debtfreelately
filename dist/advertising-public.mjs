import {t} from './i18n.mjs';

export function adPlacementLabel(id, fallback = id) {
  const labels = {
    'home-top': t('Home top', 'Đầu trang chủ', '홈 상단'),
    'home-bottom': t('Home bottom', 'Cuối trang chủ', '홈 하단'),
    'explore-sidebar': t('Discover sidebar', 'Bên cạnh Khám phá', '둘러보기 사이드바'),
    'explore-content': t('Discover content', 'Nội dung Khám phá', '둘러보기 본문'),
    'community-banner': t('Community', 'Cộng đồng', '커뮤니티'),
    'how-it-works-banner': t('How it works', 'Cách hoạt động', '이용 방법'),
    'footer-banner': t('Footer', 'Chân trang', '바닥글'),
  };
  return Object.hasOwn(labels, id) ? labels[id] : fallback;
}

// First-party delivery only. No account identifiers or persistent tracking storage.
const seen=Object.create(null), slots=new Map();
const sensitive=['broke-mode','registration-mode','bros-join-mode','messages-mode','debts-mode','card-wizard-mode'];
const allowed=new Set(['home','explore','community','how-it-works','info']);
export function safeAdContext(){
 if(sensitive.some(c=>document.body.classList.contains(c)))return null;
 const dialog=document.querySelector('dialog[open]');if(dialog)return dialog.dataset.adCommunity==='true'?'community':null;
 if(document.body.classList.contains('onboarding'))return location.hash==='#how-it-works'?'how-it-works':'home';
 if(document.body.dataset.adPage==='info')return 'info';
 return document.body.dataset.adView==='discover'?'explore':null;
}
function targets(page){const q=s=>document.querySelector(s);if(page==='home')return [['home-top',q('.welcome-content'),'before'],['home-bottom',q('.welcome-hint'),'after'],['footer-banner',q('.welcome-footer'),'before']];if(page==='how-it-works')return [['how-it-works-banner',q('.hiw-trust'),'before'],['footer-banner',q('.hiw-shell'),'append']];if(page==='community')return [['community-banner',q('dialog[open] #modal-body'),'append']];if(page==='explore')return [['explore-sidebar',q('.discover-community'),'prepend'],['explore-content',q('.discover-deck'),'append'],['community-banner',q('.discover-community'),'append'],['footer-banner',q('main>footer'),'before']];return [['footer-banner',q('main'),'append']];}
const visible=el=>!!el?.isConnected&&el.getClientRects().length>0;
function discard(id){const slot=slots.get(id);if(!slot)return;slot.cancel?.();slot.element.remove();slots.delete(id);}
function mediaURL(value){try{const u=new URL(value,location.origin);return u.origin===location.origin&&u.pathname.startsWith('/api/ads/media/')?u.href:null;}catch{return null;}}
function clickURL(value){try{const u=new URL(value,location.origin);return u.origin===location.origin&&u.pathname==='/api/ads/click'?u.href:null;}catch{return null;}}
async function post(path,body){const r=await fetch(path,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error();return r.json();}
function measure(slot,ad,page){const media=slot.element.querySelector('img')||slot.element;let timer,ratio=0,done=false;const stop=()=>{clearTimeout(timer);timer=null;};const check=()=>{stop();if(!done&&ratio>=.5&&!document.hidden&&safeAdContext()===page&&visible(media))timer=setTimeout(async()=>{if(document.hidden||safeAdContext()!==page)return;try{const result=await post('/api/ads/impression',{token:ad.token});if(result.ok){done=true;seen[ad.campaignId]=(seen[ad.campaignId]||0)+1;}}catch{}},1000);};const observer=new IntersectionObserver(entries=>{ratio=entries[0].intersectionRatio;check();},{threshold:[0,.5,1]});observer.observe(media);document.addEventListener('visibilitychange',check);return ()=>{stop();observer.disconnect();document.removeEventListener('visibilitychange',check);};}
// Measurement begins only once the media is decoded and can actually be painted.
export function whenAdImageReady(image,onReady,onFailure){
 let cancelled=false,started=false;
 const failed=()=>{if(cancelled)return;cancelled=true;image.removeEventListener('load',loaded);image.removeEventListener('error',failed);onFailure();};
 const loaded=async()=>{if(cancelled||started)return;started=true;try{if(!image.naturalWidth||!image.naturalHeight)throw Error();if(typeof image.decode==='function')await image.decode();if(!cancelled&&image.naturalWidth>0&&image.naturalHeight>0)onReady();else if(!cancelled)failed();}catch{failed();}};
 image.addEventListener('load',loaded);image.addEventListener('error',failed);
 if(image.complete&&image.naturalWidth>0)queueMicrotask(loaded);
 return ()=>{cancelled=true;image.removeEventListener('load',loaded);image.removeEventListener('error',failed);};
}
export function adImageSources(value,widths,maxWidth){
 const base=mediaURL(value);if(!base)return null;
 const safeWidths=Array.isArray(widths)?[...new Set(widths.filter(w=>Number.isSafeInteger(w)&&w>0&&w<=4096))].sort((a,b)=>a-b).slice(0,32):[];
 const width=Number(maxWidth)>0?Math.min(1200,Number(maxWidth)):1200;
 return {src:base,srcset:safeWidths.map(w=>{const u=new URL(base);u.searchParams.set('width',String(w));return u.href+' '+w+'w';}).join(', '),sizes:'(max-width: 620px) 100vw, (max-width: '+width+'px) 100vw, '+width+'px'};
}
export function applyAdSizing(element,image,placement={},device='desktop'){
 const cap=device==='mobile'?200:600;const width=Number(placement.maxWidth),height=Number(placement.height);
 element.style.maxWidth=width>0?Math.min(1200,width)+'px':'100%';
 if(image){image.style.aspectRatio=['6:1','3:1','2:1'].includes(placement.aspect)?placement.aspect.replace(':',' / '):'';image.style.height=height>0?Math.min(cap,height)+'px':'auto';image.style.maxHeight=cap+'px';image.style.objectFit='contain';}
}
export function adSlotAllowed(slot,config,device){const settings=config.settings||{};if(!settings.enabled||!settings.directEnabled||settings[device+'Enabled']===false||slot.device!==device||slot.revision!==config.revision)return false;if(Array.isArray(config.activeCampaignIds)&&!config.activeCampaignIds.includes(slot.campaignId))return false;const placements=Array.isArray(config.placements)?config.placements:config.placements?.zones||config.zones||[];const placement=placements.find(p=>p.id===slot.zoneId&&(!p.device||p.device===device));return Boolean(placement&&placement.enabled!==false&&placement.source!=='adsense'&&(!placement.campaignIds?.length||placement.campaignIds.includes(slot.campaignId)));}
export function initAdvertising({context=safeAdContext}={}){
 let settings={},currentConfig={},pending=false,lastConfig=0,epoch=0;const attempts=new Map();
 async function update(){const page=context();if(!allowed.has(page)){epoch++;for(const id of [...slots.keys()])discard(id);return;}if(document.hidden||pending)return;pending=true;const generation=epoch;
 try{if(Date.now()-lastConfig>=25000){const r=await fetch('/api/ads/config',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error();const config=await r.json();currentConfig=config;settings=config.settings||{};const device=matchMedia('(max-width:620px)').matches?'mobile':'desktop';const active=config.activeCampaignIds||settings.activeCampaignIds;const placements=Array.isArray(config.placements)?config.placements:config.placements?.zones||config.zones||[];for(const [id,slot] of slots){const placement=placements.find(p=>p.id===id&&(!p.device||p.device===device));if((Array.isArray(active)&&!active.includes(slot.campaignId))||(placement&&(placement.enabled===false||placement.source==='adsense'||(placement.campaignIds?.length&&!placement.campaignIds.includes(slot.campaignId))))||(device==='mobile'?settings.mobileEnabled===false:settings.desktopEnabled===false))discard(id);else if(placement)applyAdSizing(slot.element,slot.element.querySelector('img'),placement,device);}lastConfig=Date.now();}if(!settings.enabled||!settings.directEnabled){for(const id of [...slots.keys()])discard(id);return;}
 for(const [slotId,existing] of slots)if(!adSlotAllowed(existing,currentConfig,matchMedia('(max-width:620px)').matches?'mobile':'desktop')){discard(slotId);attempts.delete(slotId);}
 const wanted=targets(page).filter(([,el])=>visible(el));const ids=new Set(wanted.map(([id])=>id));for(const id of [...slots.keys()])if(!ids.has(id)||slots.get(id).page!==page)discard(id);
 for(const [id,target,where] of wanted){let slot=slots.get(id);if(slot&&!slot.element.isConnected){discard(id);slot=null;}if(slot&&(Date.now()-slot.at<Math.max(30,Number(settings.rotationSeconds)||30)*1000||slot.element.matches(':hover')||slot.element.contains(document.activeElement)))continue;
 if(!slot&&Date.now()-(attempts.get(id)||0)<30000)continue;attempts.set(id,Date.now());const delivery=await post('/api/ads/delivery',{page,device:matchMedia('(max-width:620px)').matches?'mobile':'desktop',zone:id,seen});if(generation!==epoch||context()!==page||!target.isConnected)continue;const ad=delivery.ad;if(!ad||ad.source!=='direct'){discard(id);continue;}const image=mediaURL(ad.imageUrl),click=clickURL(ad.clickUrl);if(!image||!click){discard(id);continue;}discard(id);const element=document.createElement('section');element.className='ad-zone';element.dataset.adZone=id;element.setAttribute('aria-label',t("Advertisement","Quảng cáo","광고"));const label=document.createElement('small');label.className='ad-label';label.textContent=t("Sponsored advertisement","Được tài trợ · Quảng cáo","유료 광고");const a=document.createElement('a');a.href=click;a.target='_blank';a.rel='sponsored noopener noreferrer';a.referrerPolicy='no-referrer';const img=document.createElement('img');const sources=adImageSources(image,ad.imageWidths,delivery.placement?.maxWidth);if(sources.srcset){img.srcset=sources.srcset;img.sizes=sources.sizes;}img.src=sources.src;img.alt=ad.alt||t("Advertisement","Quảng cáo","광고");img.referrerPolicy='no-referrer';a.append(img);element.append(label,a);const placement=delivery.placement||{};applyAdSizing(element,img,placement,matchMedia('(max-width:620px)').matches?'mobile':'desktop');if(where==='append')target.append(element);else if(where==='prepend')target.prepend(element);else target[where](element);slot={element,at:Date.now(),page,campaignId:ad.campaignId,zoneId:id,device:matchMedia('(max-width:620px)').matches?'mobile':'desktop',revision:currentConfig.revision};slots.set(id,slot);let cancelMeasure=()=>{};const cancelReady=whenAdImageReady(img,()=>{if(slots.get(id)===slot&&slot.element.isConnected&&typeof IntersectionObserver!=='undefined')cancelMeasure=measure(slot,ad,page);},()=>{if(slots.get(id)===slot)discard(id);});slot.cancel=()=>{cancelReady();cancelMeasure();};
 }
 }catch{for(const id of [...slots.keys()])discard(id);}finally{pending=false;}}
 let queued=false;const schedule=()=>{if(!context()){epoch++;for(const id of [...slots.keys()])discard(id);}if(!queued){queued=true;queueMicrotask(()=>{queued=false;update();});}};
 const observer=new MutationObserver(schedule);observer.observe(document.body,{attributes:true,attributeFilter:['class','open','data-ad-view'],childList:true,subtree:true});window.addEventListener('hashchange',schedule);document.addEventListener('visibilitychange',schedule);const interval=setInterval(update,1000);update();return ()=>{clearInterval(interval);observer.disconnect();window.removeEventListener('hashchange',schedule);document.removeEventListener('visibilitychange',schedule);for(const id of [...slots.keys()])discard(id);};
}
