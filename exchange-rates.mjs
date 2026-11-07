import {debtCurrencies} from './dist/debt-currency.mjs';

export function createRateReader({apiKey,request=fetch,now=Date.now}={}){
 let cached,expiresAt=0,pending;
 async function load(){
  const url=apiKey
   ?'https://api.currencyapi.com/v3/latest?base_currency=USD&currencies=VND,AUD,USD,EUR'
   :'https://open.er-api.com/v6/latest/USD';
  const response=await request(url,{headers:apiKey?{apikey:apiKey}:undefined,signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw Error('Exchange rate provider unavailable');
  const data=await response.json();
  const rates=Object.fromEntries(debtCurrencies.map(code=>[code,apiKey?data.data?.[code]?.value:data.rates?.[code]]));
  const timestamp=apiKey?Date.parse(data.meta?.last_updated_at):Number(data.time_last_update_unix)*1000;
  if(rates.USD!==1||Object.values(rates).some(rate=>!Number.isFinite(rate)||rate<=0)
     ||!Number.isFinite(timestamp)||timestamp<=0||timestamp>now()+300000)throw Error('Invalid exchange rates');
  expiresAt=apiKey?now()+60000:Math.max(now()+300000,Number(data.time_next_update_unix)*1000||0);
  cached={rates,updatedAt:new Date(timestamp).toISOString(),source:apiKey?'currencyapi':'exchange-rate-api'};
  return cached;
 }
 return async ()=>{
  if(cached&&now()<expiresAt)return cached;
  pending??=load().finally(()=>{pending=undefined;});
  return pending;
 };
}

const readRates=createRateReader({apiKey:process.env.CURRENCY_API_KEY});
export {readRates};
