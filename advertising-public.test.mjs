import {previewCampaign} from './dist/public-layout.mjs';
import {validGoogleConsent} from './dist/advertising-consent.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {safeAdContext,applyAdSizing,whenAdImageReady,adImageSources,adSlotAllowed} from './dist/advertising-public.mjs';
function context(classes=[],{dialog=null,hash='',view,page}={}){globalThis.document={body:{classList:{contains:c=>classes.includes(c)},dataset:{adView:view,adPage:page}},querySelector:()=>dialog};globalThis.location={hash};return safeAdContext();}

test('held banners are revoked after layout publication, device change or campaign pause',()=>{
 const slot={zoneId:'home-top',campaignId:'a',device:'desktop',revision:'live1'};
 const config={revision:'live1',settings:{enabled:true,directEnabled:true,desktopEnabled:true,mobileEnabled:true},activeCampaignIds:['a'],placements:[{id:'home-top',device:'desktop',enabled:true,source:'auto',campaignIds:[]}]};
 assert.equal(adSlotAllowed(slot,config,'desktop'),true);
 assert.equal(adSlotAllowed(slot,{...config,revision:'live2'},'desktop'),false);
 assert.equal(adSlotAllowed(slot,config,'mobile'),false);
 assert.equal(adSlotAllowed(slot,{...config,activeCampaignIds:[]},'desktop'),false);
 assert.equal(adSlotAllowed(slot,{...config,placements:[{...config.placements[0],enabled:false}]},'desktop'),false);
});
test('public ad context denies each sensitive mode even when public context is also marked',()=>{for(const cls of ['broke-mode','registration-mode','bros-join-mode','messages-mode','debts-mode','card-wizard-mode'])assert.equal(context([cls,'onboarding'],{view:'discover',page:'info'}),null);});
test('only explicit public contexts and community modal are allowed',()=>{assert.equal(context(['onboarding']),'home');assert.equal(context(['onboarding'],{hash:'#how-it-works'}),'how-it-works');assert.equal(context([],{view:'discover'}),'explore');assert.equal(context([],{page:'info'}),'info');for(const view of ['saved','mine','pledges',undefined])assert.equal(context([],{view}),null);assert.equal(context(['onboarding'],{dialog:{dataset:{}}}),null);assert.equal(context([],{dialog:{dataset:{adCommunity:'true'}}}),'community');});
test('preview and isolated public entry dependency trees exclude app bootstrap, storage and private APIs',async()=>{const checked=new Set();async function check(file){if(checked.has(file))return;checked.add(file);const source=await readFile(new URL('./dist/'+file,import.meta.url),'utf8');assert.doesNotMatch(source,/localStorage|sessionStorage|\/api\/(?:auth|cards|debts|messages)/,file);assert.doesNotMatch(source,/from ['"]\.\/app\.mjs/,file);for(const match of source.matchAll(/from ['"]\.\/([^'"]+)['"]/g))await check(match[1]);}await check('ads-preview.mjs');await check('public-entry.mjs');});

test('banner presets share renderer and preview sizing and clamp heights by device',()=>{const el={style:{}},img={style:{}};applyAdSizing(el,img,{maxWidth:5000,height:900,aspect:'3:1'},'mobile');assert.equal(el.style.maxWidth,'1200px');assert.equal(img.style.height,'200px');assert.equal(img.style.maxHeight,'200px');assert.equal(img.style.aspectRatio,'3 / 1');applyAdSizing(el,img,{height:900,aspect:'invalid'},'desktop');assert.equal(img.style.height,'600px');assert.equal(img.style.aspectRatio,'');assert.equal(el.style.maxWidth,'100%');});
test('Google consent requires allowlisted CMP and stable positive TCF vendor and storage purpose',()=>{const base={cmpStatus:'loaded',eventStatus:'useractioncomplete',cmpId:300,tcString:'valid-test-signal-123',purpose:{consents:{1:true}},vendor:{consents:{755:true}}};assert.equal(validGoogleConsent(base,true),true);for(const patch of [{cmpId:99},{eventStatus:'cmpuishown'},{cmpStatus:'stub'},{tcString:''},{purpose:{consents:{1:false}}},{vendor:{consents:{755:false}}}])assert.equal(validGoogleConsent({...base,...patch},true),false);assert.equal(validGoogleConsent(base,false),false);});

test('preview moving a campaign overrides its default zone only on the selected device',()=>{const campaign={id:'banner',draft:{placement:'home-top',devices:['desktop','mobile']}};const placements=[{id:'home-top',device:'desktop',enabled:true,campaignIds:[]},{id:'home-bottom',device:'desktop',enabled:true,campaignIds:['banner']}];const pick=(zoneId,device='desktop')=>previewCampaign({placements,campaigns:[campaign],zoneId,device});assert.equal(pick('home-top'),null);assert.equal(pick('home-bottom'),campaign);assert.equal(pick('home-top','mobile'),campaign);placements[1].enabled=false;assert.equal(pick('home-top'),campaign);assert.equal(pick('home-bottom'),null);placements[0].campaignIds=['missing'];assert.equal(pick('home-top'),null);});

class TestImage extends EventTarget {complete=false;naturalWidth=0;naturalHeight=0;decode(){return Promise.resolve();}}
test('held media cannot start measurement before load and successful decode',async()=>{
 const image=new TestImage();let ready=0,failed=0,release;
 image.decode=()=>new Promise(resolve=>{release=resolve;});
 const cancel=whenAdImageReady(image,()=>ready++,()=>failed++);
 await Promise.resolve();assert.equal(ready,0);
 image.naturalWidth=640;image.naturalHeight=200;image.dispatchEvent(new Event('load'));
 await Promise.resolve();assert.equal(ready,0);
 release();await Promise.resolve();assert.equal(ready,1);assert.equal(failed,0);cancel();
});
test('failed image or decode never starts measurement, including late completion',async()=>{
 for(const mode of ['network','decode','cancelled']){
  const image=new TestImage();let ready=0,failed=0,release;
  image.naturalWidth=640;image.naturalHeight=200;
  image.decode=()=>mode==='decode'?Promise.reject(Error('decode')):new Promise(resolve=>{release=resolve;});
  const cancel=whenAdImageReady(image,()=>ready++,()=>failed++);
  image.dispatchEvent(new Event('load'));
  if(mode==='network')image.dispatchEvent(new Event('error'));
  if(mode==='cancelled')cancel();
  release?.();await Promise.resolve();await Promise.resolve();
  assert.equal(ready,0,mode);assert.equal(failed,mode==='cancelled'?0:1,mode);cancel();
 }
});
test('responsive sources allow only safe widths and same-origin media',()=>{
 globalThis.location={origin:'https://app.example'};
 const result=adImageSources('/api/ads/media/banner',[640,320,640,-1,0,10000,'800',3.1],900);
 assert.equal(result.srcset,'https://app.example/api/ads/media/banner?width=320 320w, https://app.example/api/ads/media/banner?width=640 640w');
 assert.ok(result.sizes.endsWith('900px'));
 assert.equal(adImageSources('https://other.example/pixel',[640],900),null);
});
