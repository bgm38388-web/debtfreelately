import {t} from './i18n.mjs';

// Registration integration: callers supply the existing Broke/Bros entry points.
// This component does not create accounts or change authentication behavior.
const steps={
 Broke:[
  ['profile',t("Create Your Profile", "Tạo hồ sơ của bạn", "프로필 만들기"),t("Sign up and tell us a little about yourself.", "Đăng ký và chia sẻ đôi điều về bản thân.", "가입하고 본인을 간단히 소개해 주세요.")],
  ['story',t("Share Your Debt Story", "Chia sẻ câu chuyện về khoản nợ", "채무 사연 공유하기"),t("Add your debts, explain your situation, and upload supporting evidence privately.", "Thêm các khoản nợ, trình bày hoàn cảnh và tải tài liệu chứng minh lên ở chế độ riêng tư.", "채무 내역과 상황을 작성하고 증빙 자료를 비공개로 올리세요.")],
  ['shield',t("Complete Verification", "Hoàn tất xác minh", "확인 절차 완료하기"),t("Submit the required information for review. Verification status will be visible on your profile.", "Gửi thông tin cần thiết để xét duyệt. Trạng thái xác minh sẽ hiển thị trên hồ sơ của bạn.", "필요한 정보를 제출해 심사를 받으세요. 확인 상태는 프로필에 표시됩니다.")],
  ['heart',t("Connect With Bros", "Kết nối với Bros", "Bros와 연결하기"),t("Let potential supporters discover your story and choose whether to offer help.", "Để những người có thể hỗ trợ tìm thấy câu chuyện của bạn và quyết định có giúp đỡ hay không.", "후원을 고려하는 사람들이 여러분의 사연을 보고 도움을 줄지 결정할 수 있습니다.")]
 ],
 Bros:[
  ['profile',t("Create Your Profile", "Tạo hồ sơ của bạn", "프로필 만들기"),t("Join DebtFreeLately and become part of a community that believes in helping others.", "Tham gia DebtFreeLately và trở thành một phần của cộng đồng tin vào việc giúp đỡ người khác.", "DebtFreeLately에 가입해 서로 돕는 커뮤니티의 일원이 되어 보세요.")],
  ['search',t("Discover Stories", "Khám phá các câu chuyện", "사연 둘러보기"),t("Browse Broke profiles and learn about people facing financial challenges.", "Xem các hồ sơ Broke và tìm hiểu về những người đang gặp khó khăn tài chính.", "Broke 프로필을 둘러보고 재정적 어려움을 겪는 분들의 사연을 읽어 보세요.")],
  ['review',t("Review Before Helping", "Xem xét trước khi giúp đỡ", "도움을 주기 전에 확인하기"),t("Read their stories and check the available verification information before deciding.", "Đọc câu chuyện và kiểm tra thông tin xác minh hiện có trước khi quyết định.", "결정하기 전에 사연을 읽고 제공된 확인 정보를 살펴보세요.")],
  ['heart',t("Offer Support", "Đề nghị hỗ trợ", "도움 제안하기"),t("Choose whether to help someone through the support options available on the platform.", "Quyết định có hỗ trợ ai đó qua các lựa chọn có trên nền tảng hay không.", "플랫폼에서 제공하는 지원 방법을 살펴보고 도움을 줄지 결정하세요.")]
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
function stepCard([symbol,title,description],index){return `<li class="hiw-step"><span class="hiw-icon">${icon(symbol)}</span><div><span class="hiw-step-label">${t(`STEP ${index + 1}`, `BƯỚC ${index + 1}`, `${index + 1}단계`)}</span><h3>${title}</h3><p>${description}</p></div></li>`;}
export function initHowItWorks({Broke,Bros}){
 const section=document.createElement('section');section.id='how-it-works';section.setAttribute('aria-labelledby','hiw-title');
 section.innerHTML=`<div class="hiw-shell"><div class="hiw-brand-row"><img src="assets/debtfreelately-logo-transparent.png" alt="DebtFreeLately"><span>${t("HOW IT WORKS", "CÁCH HOẠT ĐỘNG", "이용 방법")}</span><a class="hiw-home" href="#">${t("← Home", "← Trang chủ", "← 홈")}</a></div><div class="hiw-heading"><p class="hiw-eyebrow">${t("ONE COMMUNITY. TWO WAYS TO CONNECT.", "MỘT CỘNG ĐỒNG. HAI CÁCH KẾT NỐI.", "하나의 커뮤니티, 두 가지 참여 방법.")}</p><h2 id="hiw-title">${t("A little help can change everything.", "Một chút giúp đỡ có thể thay đổi mọi thứ.", "작은 도움이 모든 것을 바꿀 수 있습니다.")}</h2><p>${t("Whether you need support or want to give it, here's how DebtFreeLately works.", "Dù bạn cần giúp đỡ hay muốn giúp đỡ người khác, đây là cách DebtFreeLately hoạt động.", "도움이 필요하거나 도움을 주고 싶다면 DebtFreeLately 이용 방법을 알아보세요.")}</p></div><div class="hiw-tabs" role="tablist" aria-label="${t("How DebtFreeLately works", "Cách DebtFreeLately hoạt động", "DebtFreeLately 이용 방법")}"><button type="button" id="hiw-tab-broke" role="tab" aria-selected="true" aria-controls="hiw-panel" data-hiw-role="Broke">${t("I'm Broke · Need Help", "Tôi là Broke · Cần giúp đỡ", "Broke · 도움이 필요해요")}</button><button type="button" id="hiw-tab-bros" role="tab" aria-selected="false" aria-controls="hiw-panel" tabindex="-1" data-hiw-role="Bros">${t("I'm a Bro · Want to Help", "Tôi là Bro · Muốn giúp đỡ", "Bro · 도움을 주고 싶어요")}</button></div><div id="hiw-panel" role="tabpanel" aria-labelledby="hiw-tab-broke" tabindex="0"></div><div class="hiw-trust"><span class="hiw-trust-icon">${icon('shield')}</span><h3>${t("Built on Trust &amp; Transparency", "Xây dựng trên niềm tin và sự minh bạch", "신뢰와 투명성을 바탕으로")}</h3><p>${t("Your privacy matters. Verification helps provide more information, but no profile or debt is guaranteed to be authentic.", "Quyền riêng tư của bạn rất quan trọng. Xác minh giúp cung cấp thêm thông tin nhưng không đảm bảo hồ sơ hay khoản nợ nào là xác thực.", "개인정보 보호는 중요합니다. 확인 절차를 통해 더 많은 정보를 얻을 수 있지만, 프로필이나 채무의 진위를 보장하지는 않습니다.")}</p></div><button type="button" class="hiw-join"></button></div>`;
 document.querySelector('#welcome').after(section);
 let selected='Broke';const tabs=[...section.querySelectorAll('[role="tab"]')],panel=section.querySelector('#hiw-panel'),join=section.querySelector('.hiw-join');
 function select(role){selected=role;for(const tab of tabs){const active=tab.dataset.hiwRole===role;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}panel.setAttribute('aria-labelledby',role==='Broke'?'hiw-tab-broke':'hiw-tab-bros');panel.innerHTML=`<ol class="hiw-steps">${steps[role].map(stepCard).join('')}</ol>`;join.textContent=t(`Join as ${role} →`, `Tham gia với vai trò ${role} →`, `${role}(으)로 참여하기 →`);}
 tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>select(tab.dataset.hiwRole));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight'||event.key==='ArrowLeft')next=1-index;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();select(tabs[next].dataset.hiwRole);tabs[next].focus();});});
 join.addEventListener('click',()=>{history.replaceState(null,'',location.pathname+location.search);({Broke,Bros})[selected]();});
 select(selected);
}
