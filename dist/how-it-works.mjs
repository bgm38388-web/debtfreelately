// Registration integration: callers supply the existing Broke/Bros entry points.
// This component does not create accounts or change authentication behavior.
const steps={
 Broke:[
  ['profile','Create Your Profile','Sign up and tell us a little about yourself.'],
  ['story','Share Your Debt Story','Add your debts, explain your situation, and upload supporting evidence privately.'],
  ['shield','Complete Verification','Submit the required information for review. Verification status will be visible on your profile.'],
  ['heart','Connect With Bros','Let potential supporters discover your story and choose whether to offer help.']
 ],
 Bros:[
  ['profile','Create Your Profile','Join DebtFreeLately and become part of a community that believes in helping others.'],
  ['search','Discover Stories','Browse Broke profiles and learn about people facing financial challenges.'],
  ['review','Review Before Helping','Read their stories and check the available verification information before deciding.'],
  ['heart','Offer Support','Choose whether to help someone through the support options available on the platform.']
 ]
};
const paths={
 profile:'<circle cx="10" cy="7" r="4"/><path d="M3 21v-2a7 7 0 0 1 10-6m5 1v8m-4-4h8"/>',
 story:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5M14 3l6 6m-6-6v6h6m-3 5v8m-4-4h8"/>',
 shield:'<path d="m12 3 8 4v5c0 5-4 8-8 10-4-2-8-5-8-10V7l8-4Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
 heart:'<path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z"/><path d="m12 6-3.8 4a2 2 0 0 0 2.8 2.8l2-2 4.5 4.5M12 17l2 2"/>',
 search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
 review:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6m-12 5 3 3 5-6"/>'
};
function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;}
function stepCard([symbol,title,description],index){return `<li class="hiw-step"><span class="hiw-icon">${icon(symbol)}</span><div><span class="hiw-step-label">STEP ${index+1}</span><h3>${title}</h3><p>${description}</p></div></li>`;}
export function initHowItWorks({Broke,Bros}){
 const section=document.createElement('section');section.id='how-it-works';section.lang='en';section.setAttribute('aria-labelledby','hiw-title');
 section.innerHTML=`<div class="hiw-shell"><div class="hiw-brand-row"><img src="assets/debtfreelately-logo-transparent.png" alt="DebtFreeLately"><span>HOW IT WORKS</span></div><div class="hiw-heading"><p class="hiw-eyebrow">ONE COMMUNITY. TWO WAYS TO CONNECT.</p><h2 id="hiw-title">A little help can change everything.</h2><p>Whether you need support or want to give it, here's how DebtFreeLately works.</p></div><div class="hiw-tabs" role="tablist" aria-label="How DebtFreeLately works"><button type="button" id="hiw-tab-broke" role="tab" aria-selected="true" aria-controls="hiw-panel" data-hiw-role="Broke">I'm Broke · Need Help</button><button type="button" id="hiw-tab-bros" role="tab" aria-selected="false" aria-controls="hiw-panel" tabindex="-1" data-hiw-role="Bros">I'm a Bro · Want to Help</button></div><div id="hiw-panel" role="tabpanel" aria-labelledby="hiw-tab-broke" tabindex="0"></div><div class="hiw-trust"><span class="hiw-trust-icon">${icon('shield')}</span><h3>Built on Trust &amp; Transparency</h3><p>Your privacy matters. Verification helps provide more information, but no profile or debt is guaranteed to be authentic.</p></div><button type="button" class="hiw-join">Join as Broke →</button></div>`;
 document.querySelector('#welcome').after(section);
 let selected='Broke';const tabs=[...section.querySelectorAll('[role="tab"]')],panel=section.querySelector('#hiw-panel'),join=section.querySelector('.hiw-join');
 function select(role){selected=role;for(const tab of tabs){const active=tab.dataset.hiwRole===role;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}panel.setAttribute('aria-labelledby',role==='Broke'?'hiw-tab-broke':'hiw-tab-bros');panel.innerHTML=`<ol class="hiw-steps">${steps[role].map(stepCard).join('')}</ol>`;join.textContent=`Join as ${role} →`;}
 tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>select(tab.dataset.hiwRole));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight'||event.key==='ArrowLeft')next=1-index;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();select(tabs[next].dataset.hiwRole);tabs[next].focus();});});
 join.addEventListener('click',()=>({Broke,Bros})[selected]());
 select(selected);
}
