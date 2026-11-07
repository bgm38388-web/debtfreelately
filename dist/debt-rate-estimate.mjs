import {debtCurrencies,formatDebtAmount} from './debt-currency.mjs';
import {t} from './i18n.mjs';

const estimates=new Set();
let timer,rateData,request,lastAttempt=0;

async function refresh(){
 if(document.hidden||request||Date.now()-lastAttempt<60000)return;
 lastAttempt=Date.now();
 request=true;
 try{
  const response=await fetch('/api/exchange-rates',{signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Exchange rates unavailable');
  rateData=await response.json();
 }catch{
  rateData=undefined;
 }finally{
  request=false;
  for(const estimate of estimates)estimate.render();
 }
}

class DebtRateEstimate extends HTMLElement{
 connectedCallback(){
  estimates.add(this);
  timer??=setInterval(refresh,60000);
  this.render();
  refresh();
 }

 disconnectedCallback(){
  estimates.delete(this);
  if(!estimates.size){
   clearInterval(timer);
   timer=undefined;
  }
 }

 render(){
  if(!rateData){
   this.textContent=lastAttempt&&!request?t('Exchange rates temporarily unavailable.','Tạm thời chưa lấy được tỷ giá.','현재 환율을 불러올 수 없습니다.'):'';
   return;
  }
  const debts=JSON.parse(this.dataset.debts);
  const {rates,updatedAt,source}=rateData;
  const baseTotal=debts.reduce((total,{amount,currency})=>total+amount/rates[currency],0);
  const targets=debtCurrencies.filter(code=>debts.some(debt=>debt.currency!==code));
  const summary=document.createElement('strong');
  summary.textContent='≈ '+targets.map(code=>formatDebtAmount(baseTotal*rates[code],code)).join(' · ');

  const caption=document.createElement('small');
  const date=new Intl.DateTimeFormat(t('en-AU','vi-VN','ko-KR'),{dateStyle:'medium',timeStyle:'short'}).format(new Date(updatedAt));
  caption.textContent=t('Rate updated ','Tỷ giá cập nhật ','환율 갱신 ')+date+' · ';
  const link=document.createElement('a');
  link.href=source==='currencyapi'?'https://currencyapi.com/':'https://www.exchangerate-api.com/';
  link.target='_blank';
  link.rel='noopener noreferrer';
  link.textContent=source==='currencyapi'?'currencyapi':'Rates By Exchange Rate API';
  caption.append(link);
  this.replaceChildren(summary,caption);
 }
}

customElements.define('debt-rate-estimate',DebtRateEstimate);
