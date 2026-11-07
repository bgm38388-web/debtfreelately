import {t} from './i18n.mjs';

export const debtCurrencies=['VND','AUD','USD','EUR'];
export const currencyStep=currency=>currency==='VND'?1:0.01;

export function validDebtAmount(amount,currency='VND'){
 return debtCurrencies.includes(currency)&&Number.isFinite(amount)&&amount>=currencyStep(currency)&&amount<=1e12
  &&Number(amount.toFixed(currency==='VND'?0:2))===amount;
}

export function formatDebtAmount(amount,currency='VND'){
 return new Intl.NumberFormat(t('en-AU','vi-VN','ko-KR'),{style:'currency',currency,currencyDisplay:'code'}).format(amount);
}

export function formatDebtTotals(debts){
 const totals=new Map();
 for(const {amount,currency='VND'} of debts){
  const units=currency==='VND'?1:100;
  totals.set(currency,(totals.get(currency)??0)+Math.round(amount*units));
 }
 return [...totals].map(([currency,total])=>formatDebtAmount(total/(currency==='VND'?1:100),currency)).join(' · ');
}

export function convertAmount(amount,from,to,rates){
 return Number((amount/rates[from]*rates[to]).toFixed(to==='VND'?0:2));
}
