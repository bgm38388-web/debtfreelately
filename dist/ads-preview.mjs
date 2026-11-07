import {t} from './i18n.mjs';
import {adPlacementLabel,adPlacementTargets,applyAdSizing} from './advertising-public.mjs';
import {landingHTML,infoHTML,previewCampaign} from './public-layout.mjs';
import {initHowItWorks} from './how-it-works.mjs';
import {discoverIntro,discoverCommunity,discoveryCard} from './discover-design.mjs';
const stage=document.querySelector('#preview-stage');let snapshot,model,selected,renderedPage;
const pages=new Set(['home','explore','community','how-it-works','info']);
function send(type,extra={}){if(window.parent!==window)window.parent.postMessage({type,...extra},location.origin);}
function zone(id){const el=document.createElement('section');el.className='ad-zone ad-preview-zone';el.dataset.adZone=id;el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',t(`Select placement: ${adPlacementLabel(id)}`,`Chọn vị trí: ${adPlacementLabel(id)}`,`${adPlacementLabel(id)} 게재 위치 선택`));el.draggable=false;const label=document.createElement('small');label.textContent=adPlacementLabel(id)+t(" · Advertisement"," · Quảng cáo"," · 광고");el.append(label);const placement=(model.placements||[]).find(p=>p.id===id&&(!p.device||p.device===model.device));const campaigns=model.campaigns||[];const campaign=previewCampaign({placements:model.placements||[],campaigns,zoneId:id,device:model.device});const fields=campaign?.draft||campaign?.live||campaign;const creative=(model.creatives||[]).find(c=>c.id===fields?.creativeId);
 if(model.showSamples){
  el.classList.add('ad-preview-sample');
  const sample=document.createElement('p');
  const name=document.createElement('strong');
  name.textContent=t('SAMPLE AD','QUẢNG CÁO MẪU','예시 광고');
  const detail=document.createElement('span');
  const source={auto:t('Automatic rotation','Tự luân phiên','자동 순환'),direct:t('Direct','Trực tiếp','직접 광고'),adsense:'Google AdSense'}[placement?.source];
  detail.textContent=[id,source,placement?.aspect,placement?.maxWidth&&placement.maxWidth+' px',placement?.height&&placement.height+' px'].filter(Boolean).join(' · ')+' · '+(placement?.enabled?t('Enabled in layout draft','Đang bật trong nháp bố cục','레이아웃 초안에서 사용 중'):t('Disabled in layout draft','Đang tắt trong nháp bố cục','레이아웃 초안에서 사용 중지'));
  sample.append(name,detail);
  el.append(sample);
 }else if(creative&&fields?.type!=='adsense'){const img=document.createElement('img');img.src='/api/ads/media/'+encodeURIComponent(creative.id)+'?preview=1';img.alt=creative.alt||t("Preview banner","Banner xem trước","미리보기 배너");img.addEventListener('error',()=>{img.remove();const note=document.createElement('p');note.textContent=t("Could not load the preview banner.","Chưa tải được banner xem trước.","미리보기 배너를 불러올 수 없습니다.");el.append(note);},{once:true});el.append(img);}else{const note=document.createElement('p');note.textContent=fields?.type==='adsense'?t("Google AdSense placement · Live ads disabled in preview","Vị trí Google AdSense · Không tải quảng cáo thật khi xem trước","Google AdSense 게재 위치 · 미리보기에서 실제 광고 사용 안 함"):t("Select a campaign for this placement","Chọn chiến dịch cho vị trí này","이 위치에 게재할 캠페인을 선택하세요");el.append(note);}const image=el.querySelector('img');
 applyAdSizing(el,image,placement||{},model.device);
 if(!image){
  const box=el.querySelector('p');
  const ratio=Number(placement?.aspect?.split(':')[0])||3;
  const height=Math.min(model.device==='mobile'?200:600,placement?.height||120);
  box.classList.add('ad-preview-placeholder');
  box.style.width='min(100%, '+height*ratio+'px)';
  box.style.aspectRatio=ratio+' / 1';
 }if(placement?.enabled===false)el.setAttribute('aria-description',t("Placement disabled","Vị trí đang tắt","사용 중지된 게재 위치"));const choose=()=>{selected=id;stage.querySelectorAll('.ad-preview-zone').forEach(z=>z.classList.toggle('selected',z.dataset.adZone===id));send('ads-preview-zone',{zoneId:id});};el.onclick=choose;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}};el.ondragover=e=>e.preventDefault();el.ondrop=e=>{e.preventDefault();choose();const campaignId=e.dataTransfer?.getData('text/plain');if(campaignId)send('ads-preview-zone',{zoneId:id,campaignId});};if(selected===id)el.classList.add('selected');return el;}
function mount(id,target,where='append'){if(target){const z=zone(id);if(where==='append')target.append(z);else if(where==='prepend')target.prepend(z);else target[where](z);}}
function render(){const page=pages.has(model.page)?model.page:'home';const scrollTop=renderedPage===page?document.scrollingElement.scrollTop:0;renderedPage=page;for(const name of ['privacy','about']){let link=document.querySelector('link[data-preview-info="'+name+'"]');if(!link){link=document.createElement('link');link.rel='stylesheet';link.href='/'+name+'.css';link.dataset.previewInfo=name;document.head.append(link);}link.disabled=page!=='info';}stage.className='ad-preview-stage '+(model.device==='mobile'?'mobile':'desktop');stage.replaceChildren();document.body.className=page==='home'||page==='how-it-works'?'onboarding':page==='explore'||page==='community'?'swipe-page':'';
 if(page==='home'||page==='how-it-works'){stage.innerHTML=landingHTML;initHowItWorks({Broke:()=>{},Bros:()=>{}});const welcome=stage.querySelector('#welcome'),hiw=stage.querySelector('#how-it-works');welcome.style.display=page==='home'?'flex':'none';hiw.style.display=page==='how-it-works'?'block':'none';}
 else if(page==='explore'||page==='community'){const card={name:t("Sample story","Câu chuyện minh họa","예시 사연"),age:null,location:t("Community","Cộng đồng","커뮤니티"),photo:null,debts:[{title:t("A fresh start","Một khởi đầu mới","새로운 시작"),amount:1000000,story:t("Public sample content for previewing the layout.","Dữ liệu minh họa công khai dành cho xem trước bố cục.","레이아웃을 미리 보기 위한 공개 예시입니다.")}]};const post={id:'preview-public',amount:1000000,pledged:0,category:t("Other","Khác","기타"),sample:true};stage.innerHTML='<div class="main"><main><section class="content-grid"><section id="content"><div class="discover-layout">'+discoverIntro()+'<section class="discover-deck"><section class="swipe-stage">'+discoveryCard(card,{post,saved:false})+'</section></section>'+discoverCommunity({stories:0,saved:0})+'</div></section></section><footer>DebtFreeLately © 2026</footer></main></div>';if(page==='community'){
  const dialog=document.createElement('dialog');
  dialog.id='modal';
  dialog.open=true;
  dialog.innerHTML='<div id="modal-body"><h2>'+t('Community','Cộng đồng','커뮤니티')+'</h2><p>'+t('A place to connect and support one another.','Nơi kết nối và hỗ trợ lẫn nhau.','서로 연결하고 돕는 공간입니다.')+'</p></div>';
  stage.append(dialog);
 }}
 else{stage.innerHTML=infoHTML;}
 for(const [id,target,where] of adPlacementTargets(page,stage))mount(id,target,where);
 stage.querySelectorAll('button:not(.ad-preview-zone),input,select,textarea').forEach(el=>{if(!el.closest('#how-it-works [role="tablist"]'))el.disabled=true;});stage.querySelectorAll('a').forEach(a=>{a.removeAttribute('href');a.setAttribute('aria-disabled','true');});document.scrollingElement.scrollTop=scrollTop;}
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='ads-preview-config'||!snapshot)return;const input=event.data;if(!pages.has(input.page)||!['desktop','mobile'].includes(input.device))return;model={placements:Array.isArray(input.placements)?input.placements:snapshot.placements?.draft?.zones||[],campaigns:Array.isArray(input.campaigns)?input.campaigns:snapshot.campaigns||[],creatives:Array.isArray(input.creatives)?input.creatives:snapshot.creatives||[],device:input.device,page:input.page,showSamples:input.showSamples===true};selected=input.zoneId;render();});
try{const response=await fetch('/api/admin/ads/preview',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error();const result=await response.json();if(!result.allowed)throw Error();snapshot=result.config;model={placements:snapshot.placements?.draft?.zones||[],campaigns:snapshot.campaigns||[],creatives:snapshot.creatives||[],device:'desktop',page:'home'};document.querySelector('.ad-preview-note').textContent=t("Layout preview. Impression and click tracking and private actions are disabled.","Xem trước bố cục · Không ghi lượt hiển thị hoặc lượt nhấp. Các thao tác riêng tư đã tắt.","레이아웃 미리보기입니다. 노출 및 클릭 집계와 비공개 기능은 사용 중지되었습니다.");render();send('ads-preview-ready');}catch{document.querySelector('.ad-preview-note').textContent=t("Sign in as an administrator to preview ads.","Bạn cần đăng nhập quản trị để xem trước quảng cáo.","광고를 미리 보려면 관리자 계정으로 로그인하세요.");}
