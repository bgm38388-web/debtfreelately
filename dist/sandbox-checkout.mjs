import {t} from './i18n.mjs';

export async function sandboxCall(path,body){
 const response=await fetch('/api/'+path,{credentials:'same-origin',cache:'no-store',...(body===undefined?{}:{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
 })});
 const data=await response.json();
 if(!response.ok)throw Object.assign(Error(data.error||'Sandbox request failed.'),{status:response.status});
 return data;
}

let sdk;
function loadSDK(){
 return sdk??=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://www.sandbox.paypal.com/web-sdk/v6/core';
  script.onload=()=>resolve(window.paypal);
  script.onerror=()=>{script.remove();sdk=undefined;reject(Error('Could not load PayPal Sandbox.'));};
  document.head.append(script);
 });
}
function element(tag,text,parent){
 const node=document.createElement(tag);
 if(text!==undefined)node.textContent=text;
 parent?.append(node);
 return node;
}
function money(row){
 return new Intl.NumberFormat(document.documentElement.lang,{style:'currency',currency:row.currency,currencyDisplay:'code'})
  .format(row.grossMinor/(row.currency==='JPY'?1:100));
}
const labels={
 completed:()=>t('Sandbox payment confirmed','Đã xác nhận thanh toán thử','샌드박스 결제 확인'),
 pending:()=>t('Payment pending','Đang chờ thanh toán','결제 대기'),
 awaiting_approval:()=>t('Awaiting PayPal approval or capture','Đang chờ PayPal phê duyệt hoặc xác nhận','PayPal 승인 또는 결제 확정 대기'),
 failed:()=>t('Failed','Thất bại','실패'),
 refunded:()=>t('Refunded','Đã hoàn tiền','환불 완료'),
 partially_refunded:()=>t('Partially refunded','Đã hoàn tiền một phần','부분 환불'),
 reversed:()=>t('Reversed','Đã đảo giao dịch','결제 취소'),
 open:()=>t('Dispute open','Đang tranh chấp','분쟁 진행 중'),
 resolved:()=>t('Dispute resolved','Tranh chấp đã xử lý','분쟁 해결'),
 approved:()=>t('Sandbox payout approved for review','Đã duyệt xử lý thử','샌드박스 지급 검토 승인'),
 held:()=>t('Payout on hold','Tạm dừng xử lý chi trả','지급 보류'),
 receipt_confirmed:()=>t('Sandbox creditor receipt recorded','Đã ghi nhận biên nhận thử của chủ nợ','샌드박스 채권자 영수증 기록')
};
function label(status){return labels[status]?.()||status;}
function contributionStatus(row){
 const payment=row.status==='completed'&&!row.webhookConfirmed?t('Capture recorded. Awaiting PayPal webhook confirmation.','Đã ghi nhận giao dịch. Đang chờ webhook PayPal xác nhận.','결제가 기록되었습니다. PayPal 웹훅 확인 대기 중입니다.'):label(row.status);
 const payout=row.payoutStatus==='failed'?t('Payout failed','Chi trả thất bại','지급 실패'):
  row.payoutStatus&&row.payoutStatus!=='unreviewed'?label(row.payoutStatus):'';
 return [payment,row.disputeStatus&&label(row.disputeStatus),payout].filter(Boolean).join(' · ');
}
function localCurrency(){
 const region=navigator.languages?.map(value=>{try{return new Intl.Locale(value).region;}catch{return null;}}).find(Boolean);
 return {AU:'AUD',US:'USD',GB:'GBP',CA:'CAD',NZ:'NZD',SG:'SGD',JP:'JPY',DE:'EUR',FR:'EUR',ES:'EUR',IT:'EUR',IE:'EUR',NL:'EUR'}[region]||'USD';
}

export async function openSandboxCheckout({cardId,debts,eligibleIndexes,modal}){
 modal(`<h2>PayPal Sandbox Checkout</h2><p>${t('Test money only. This does not repay debt.','Chỉ dùng tiền thử. Khoản nợ chưa được thanh toán.','테스트 결제이며 채무는 상환되지 않습니다.')}</p><div id="sandbox-checkout"></div>`);
 const root=document.querySelector('#sandbox-checkout');
 const debtLabel=element('label',t('Debt case','Khoản nợ','채무 항목'),root);
 const debtSelect=element('select',undefined,debtLabel);
 for(const index of eligibleIndexes){const option=element('option',debts[index].title,debtSelect);option.value=index;}
 const form=element('div',undefined,root);
 const status=element('p',undefined,root);
 status.setAttribute('role','status');
 let selection=0;
 let client;
 async function showDebt(){
  const version=++selection;
  const debtIndex=Number(debtSelect.value);
  form.replaceChildren();
  status.textContent=t('Checking this debt case…','Đang kiểm tra khoản nợ…','채무 항목 확인 중…');
  try{
   const query=new URLSearchParams({cardId,debtIndex});
   const config=await sandboxCall('contributions/options?'+query);
   if(version!==selection||!root.isConnected)return;
   client??=(await loadSDK()).createInstance({clientId:config.clientId,components:['paypal-payments'],pageType:'checkout'});
   const instance=await client;
   if(version!==selection||!root.isConnected)return;
   const currencyLabel=element('label',t('Currency','Đồng tiền','통화'),form);
   const currency=element('select',undefined,currencyLabel);
   for(const code of new Set(config.options.map(option=>option.currency)))element('option',code,currency);
   if([...currency.options].some(option=>option.value===localCurrency()))currency.value=localCurrency();
   const amountLabel=element('label',t('Contribution amount','Mức đóng góp','지원 금액'),form);
   const amount=element('select',undefined,amountLabel);
   const button=element('paypal-button',undefined,form);
   button.hidden=true;
   let attempt,busy=false,check=0;
   function lock(value){
    busy=value;debtSelect.disabled=value;currency.disabled=value;amount.disabled=value;
    if(value)button.hidden=true;
   }
   async function showCurrency(){
    const current=++check;
    button.hidden=true;
    amount.replaceChildren();
    for(const price of config.options.filter(option=>option.currency===currency.value)){
     const item=element('option',money(price),amount);item.value=price.id;
    }
    try{
     const result=await instance.findEligibleMethods({currencyCode:currency.value});
     if(check!==current||version!==selection)return;
     button.hidden=!result.isEligible('paypal');
     status.textContent=button.hidden?t('PayPal is unavailable for this selection.','PayPal không khả dụng với lựa chọn này.','이 선택에는 PayPal을 사용할 수 없습니다.'):'';
    }catch{if(check===current)status.textContent=t('PayPal eligibility check failed.','Không kiểm tra được PayPal.','PayPal 이용 가능 여부를 확인하지 못했습니다.');}
   }
   const session=instance.createPayPalOneTimePaymentSession({
    async onApprove({orderId}){
     try{
      const row=await sandboxCall('contributions/capture',{orderId});
      const history=await sandboxCall('contributions/history');
      status.textContent=contributionStatus(history.contributions.find(item=>item.id===row.id)||row);
     }catch{
      status.textContent=t('Could not confirm capture. Open Sandbox contribution history to check or retry this order.','Chưa xác nhận được giao dịch. Mở lịch sử Sandbox để kiểm tra hoặc thử lại đơn này.','결제를 확인하지 못했습니다. 샌드박스 기록에서 이 주문을 확인하거나 다시 시도하세요.');
     }
     button.hidden=true;
     debtSelect.disabled=false;
    },
    onCancel(){
     attempt=undefined;
     lock(false);button.hidden=false;
     status.textContent=t('Checkout cancelled.','Đã hủy thanh toán.','결제가 취소되었습니다.');
    },
    onError(){
     status.textContent=t('PayPal checkout failed. You can retry this attempt.','PayPal gặp lỗi. Bạn có thể thử lại giao dịch này.','PayPal 결제에 실패했습니다. 다시 시도할 수 있습니다.');
     lock(false);button.hidden=false;
    }
   });
   button.addEventListener('click',()=>{
    if(busy||button.hidden)return;
    const option=amount.value;
    if(attempt?.option!==option)attempt={option,requestId:crypto.randomUUID()};
    lock(true);
    status.textContent=t('Opening PayPal Sandbox…','Đang mở PayPal Sandbox…','PayPal 샌드박스 여는 중…');
    const order=sandboxCall('contributions/order',{cardId,debtIndex,...attempt}).then(({orderId})=>({orderId}));
    session.start({presentationMode:'auto'},order).catch(()=>{
     lock(false);button.hidden=false;
     status.textContent=t('Checkout did not finish. Retry this attempt or check your contribution history.','Thanh toán chưa hoàn tất. Thử lại hoặc xem lịch sử đóng góp.','결제가 완료되지 않았습니다. 다시 시도하거나 지원 기록을 확인하세요.');
    });
   });
   currency.onchange=showCurrency;
   await showCurrency();
  }catch(error){
   if(version!==selection)return;
   status.textContent=error.status===409?t('This debt case is awaiting creditor verification.','Khoản nợ này đang chờ xác minh chủ nợ.','이 채무는 채권자 확인을 기다리고 있습니다.'):
    error.status===401?t('Sign in as Bros to continue.','Đăng nhập tài khoản Bros để tiếp tục.','Bros로 로그인하여 계속하세요.'):error.message;
  }
 }
 debtSelect.onchange=showDebt;
 await showDebt();
}
export async function addContributionHistory(root,{allowRetry=false}={}){
 const {enabled}=await sandboxCall('contributions/config').catch(()=>({enabled:false}));
 if(!enabled||!root.isConnected)return;
 const button=element('button',t('Sandbox contribution history','Lịch sử đóng góp Sandbox','샌드박스 지원 기록'),root);
 button.type='button';
 button.className='secondary';
 const panel=element('div',undefined,root);
 panel.setAttribute('aria-live','polite');
 async function show(){
  button.disabled=true;
  panel.textContent=t('Loading…','Đang tải…','불러오는 중…');
  try{
   const {contributions}=await sandboxCall('contributions/history');
   panel.replaceChildren();
   if(!contributions.length)element('p',t('No Sandbox contributions yet.','Chưa có đóng góp thử.','샌드박스 지원 기록이 없습니다.'),panel);
   for(const row of contributions){
    const entry=element('p',row.title+' · '+money(row)+' · '+contributionStatus(row),panel);
    if(allowRetry&&row.status==='awaiting_approval'){
     const retry=element('button',t('Retry capture','Thử xác nhận lại','결제 확정 다시 시도'),entry);
     retry.onclick=async()=>{
      retry.disabled=true;
      try{await sandboxCall('contributions/capture',{orderId:row.orderId});await show();}
      catch(error){element('small',error.message,entry);retry.disabled=false;}
     };
    }
   }
  }catch(error){panel.textContent=error.message;}
  finally{button.disabled=false;}
 }
 button.onclick=show;
}
