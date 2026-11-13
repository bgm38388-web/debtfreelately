import {t} from './i18n.mjs';
import {sandboxCall} from './sandbox-checkout.mjs';

export async function addSandboxAdmin(container,back){
 const {enabled}=await sandboxCall('contributions/config').catch(()=>({enabled:false}));
 if(!enabled||!container.isConnected)return;
 const button=document.createElement('button');
 button.className='secondary';
 button.textContent=t('Sandbox payouts','Chi trả thử Sandbox','샌드박스 지급');
 container.append(button);
 const root=container.closest('main');
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const actions=[
  ['approve',t('Approve placeholder payout','Duyệt chi trả thử','테스트 지급 승인')],
  ['fail',t('Record payout failure','Ghi nhận chi trả thất bại','지급 실패 기록')],
  ['confirm_receipt',t('Record simulated creditor receipt','Ghi nhận biên nhận thử của chủ nợ','테스트 채권자 영수증 기록')]
 ];
 async function show(){
  root.innerHTML=`<section class="review-panel"><button class="secondary" id="sandbox-back">${t('Back','Quay lại','뒤로')}</button>
  <h1>${button.textContent}</h1><p>${t('Sandbox records only. Use test references.','Chỉ lưu dữ liệu thử. Dùng mã tham chiếu thử.','샌드박스 기록만 저장됩니다. 테스트 참조를 사용하세요.')}</p>
  <div id="sandbox-admin-data"></div><p id="sandbox-admin-status" role="status"></p></section>`;
  root.querySelector('#sandbox-back').onclick=back;
  const panel=root.querySelector('#sandbox-admin-data');
  const status=root.querySelector('#sandbox-admin-status');
  try{
   const {cases,contributions,audit}=await sandboxCall('admin/sandbox/payouts');
   const caseOptions=cases.flatMap(card=>card.debts.map((debt,index)=>
    `<option value="${esc(card.id)}:${index}">${esc(debt.title)} · ${esc(card.id)} #${index+1}</option>`)).join('');
   const referenceLabel=t('Evidence reference','Mã tham chiếu bằng chứng','증빙 참조');
   const reference=`<label>${referenceLabel}<input name="reference" required maxlength="240"></label>`;
   panel.innerHTML=`<h2>${t('Verify a creditor','Xác minh chủ nợ','채권자 확인')}</h2>
    <form id="sandbox-creditor"><label>${t('Approved debt case','Khoản nợ đã duyệt','승인된 채무')}<select name="debt" required><option value=""></option>${caseOptions}</select></label>
    ${reference}<button>${t('Record verification','Lưu xác minh','확인 기록')}</button></form>
    <h2>${t('Contribution review','Xét duyệt đóng góp','지원 검토')}</h2>
    <form id="sandbox-payout"><label>${t('Contribution','Khoản đóng góp','지원')}<select name="id" required><option value=""></option>
    ${contributions.map(row=>`<option value="${esc(row.id)}">${esc(row.title)} · ${esc(row.currency)} ${esc(row.grossMinor/(row.currency==='JPY'?1:100))} · ${esc(row.status)} / ${esc(row.payoutStatus)}${row.disputeStatus?' / '+esc(row.disputeStatus):''} · ${esc(row.orderId)}</option>`).join('')}</select></label>
    <label>${t('Action','Thao tác','작업')}<select name="action">${actions.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label>
    ${reference}<button>${t('Record decision','Lưu quyết định','결정 기록')}</button></form>
    <h2>${t('Audit history','Nhật ký kiểm tra','감사 기록')}</h2>
    <ul>${audit.map(row=>`<li>${esc(row.at)} · ${esc(row.actor)} · ${esc(row.action)} · ${esc(row.subject)} · ${esc(row.reference)}</li>`).join('')}</ul>`;
   for(const [id,path] of [['creditor','creditor'],['payout','payout']]){
    panel.querySelector('#sandbox-'+id).onsubmit=async event=>{
     event.preventDefault();
     const form=event.currentTarget;
     const input=Object.fromEntries(new FormData(form));
     if(id==='creditor'){
      const [cardId,index]=input.debt.split(':');
      input.cardId=cardId;input.debtIndex=Number(index);
     }
     const submit=form.querySelector('button');
     submit.disabled=true;
     try{await sandboxCall('admin/sandbox/'+path,input);if(panel.isConnected)await show();}
     catch(error){status.textContent=error.message;}
     finally{submit.disabled=false;}
    };
   }
  }catch(error){status.textContent=error.message;}
 }
 button.onclick=show;
}
