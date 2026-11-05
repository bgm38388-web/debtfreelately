import {validGoogleConsent} from './advertising-consent.mjs';
import {landingHTML} from './public-layout.mjs';
import {initHowItWorks} from './how-it-works.mjs';
import {initAdvertising} from './advertising-public.mjs';
// Dedicated public document: no app bootstrap, private API or browser storage.
const isInfo=/\/(privacy|transparency|community-safety|about)\.html$/.test(location.pathname);
if(!isInfo)document.body.insertAdjacentHTML('afterbegin',landingHTML);
let config;try{const r=await fetch('/api/ads/config',{credentials:'omit',cache:'no-store'});if(r.ok)config=await r.json();}catch{}
let settings=config?.settings||{};let canonical;try{const u=new URL(config?.canonicalOrigin||settings.canonicalOrigin);if(u.protocol==='https:'&&u.origin!==location.origin)canonical=u.origin;}catch{}
const join=role=>{if(canonical)location.assign(canonical+'/?role='+encodeURIComponent(role));};
if(!isInfo){initHowItWorks({Broke:()=>join('Broke'),Bros:()=>join('Bros')});document.querySelectorAll('[data-role]').forEach(b=>{b.disabled=!canonical;b.addEventListener('click',()=>join(b.dataset.role));});}
else document.body.dataset.adPage='info';
// Direct delivery is first-party; canonical documents never execute the Google path.
initAdvertising();
// Google CMP must be deployed separately on this isolated hostname; no arbitrary
// script input is accepted. The consent listener also handles decisions made later.
const isolated=()=>settings.publicOrigin===location.origin&&canonical&&canonical!==location.origin&&window.top===window.self;
let consent=false,googleScript=null,googleReady=null,googleEverLoaded=false,attachedAPI=null,navigation=0,attemptedNavigation=-1,loading=false;
function removeGoogleUnits(){document.querySelectorAll('[data-google-ad-zone]').forEach(el=>el.remove());}
function unloadGoogle(){consent=false;navigation++;removeGoogleUnits();googleScript?.remove();if(googleEverLoaded)location.reload();}
function enabled(){return isolated()&&settings.enabled&&settings.adsenseEnabled&&settings.googleApproved&&settings.consentConfigured&&/^ca-pub-\d{16}$/.test(settings.publisherId);}
function scriptReady(){if(googleReady)return googleReady;googleEverLoaded=true;googleReady=new Promise((resolve,reject)=>{googleScript=document.createElement('script');googleScript.async=true;googleScript.crossOrigin='anonymous';googleScript.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(settings.publisherId);googleScript.onload=resolve;googleScript.onerror=reject;document.head.append(googleScript);});return googleReady;}
async function loadGoogle(){
 if(!enabled()||!consent||document.hidden||loading||attemptedNavigation===navigation)return;
 loading=true;const generation=navigation;attemptedNavigation=generation;
 try{const page=isInfo?'info':location.hash==='#how-it-works'?'how-it-works':'home';const zone=page==='home'?'home-bottom':page==='how-it-works'?'how-it-works-banner':'footer-banner';const r=await fetch('/api/ads/delivery',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({page,zone,device:matchMedia('(max-width:620px)').matches?'mobile':'desktop',seen:{}})});if(!r.ok)return;const delivery=await r.json();if(delivery?.ad?.source!=='adsense'||!/^\d{6,20}$/.test(delivery.ad.unitId||'')||generation!==navigation||!consent||!enabled())return;
 const target=page==='home'?document.querySelector('.welcome-hint'):page==='how-it-works'?document.querySelector('.hiw-trust'):document.querySelector('main');if(!target)return;
 const section=document.createElement('section');section.className='ad-zone';section.dataset.googleAdZone=zone;const label=document.createElement('small');label.className='ad-label';label.textContent='Quảng cáo';const ins=document.createElement('ins');ins.className='adsbygoogle';ins.style.display='block';ins.dataset.adClient=settings.publisherId;ins.dataset.adSlot=delivery.ad.unitId;ins.dataset.adFormat='auto';ins.dataset.fullWidthResponsive='true';section.append(label,ins);target.after(section);const nofill=new MutationObserver(()=>{if(ins.dataset.adStatus==='unfilled'){section.remove();nofill.disconnect();}});nofill.observe(ins,{attributes:true,attributeFilter:['data-ad-status']});
 try{await scriptReady();if(generation===navigation&&consent&&enabled()&&section.isConnected)(window.adsbygoogle=window.adsbygoogle||[]).push({});else section.remove();}catch{section.remove();}
 }catch{}finally{loading=false;if(generation!==navigation)loadGoogle();}
}
function watchCMP(){if(!isolated()||typeof window.__tcfapi!=='function'||attachedAPI===window.__tcfapi)return;attachedAPI=window.__tcfapi;try{attachedAPI('addEventListener',2,(data,success)=>{const valid=validGoogleConsent(data,success);const stable=success&&data?.cmpStatus==='loaded'&&['tcloaded','useractioncomplete'].includes(data.eventStatus);if(!stable)return;if(!valid){if(consent||googleEverLoaded)unloadGoogle();else consent=false;return;}consent=true;loadGoogle();});}catch{attachedAPI=null;}}
if(isolated()){watchCMP();setInterval(watchCMP,1000);setInterval(async()=>{if(document.hidden)return;try{const r=await fetch('/api/ads/config',{credentials:'omit',cache:'no-store'});if(!r.ok)return;const next=await r.json();const oldPublisher=settings.publisherId;settings=next.settings||{};if((!enabled()||oldPublisher!==settings.publisherId)&&googleEverLoaded)unloadGoogle();watchCMP();}catch{}},25000);window.addEventListener('hashchange',()=>{navigation++;attemptedNavigation=-1;removeGoogleUnits();loadGoogle();});document.addEventListener('visibilitychange',()=>{if(!document.hidden){watchCMP();loadGoogle();}});}
