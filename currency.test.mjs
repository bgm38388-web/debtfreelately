import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicCard,validateDetails,defaultPrivacy} from './dist/card-model.mjs';
import {convertAmount} from './dist/debt-currency.mjs';
import {createRateReader} from './exchange-rates.mjs';

test('card validation and projection preserve original currency and precision',()=>{
 const old={title:'Rent',story:'Rent arrears',amount:2500000};
 const foreign={...old,amount:125.46,currency:'AUD'};
 assert.deepEqual(validateDetails([old,foreign]),[old,foreign]);
 assert.deepEqual(publicCard([old,foreign],defaultPrivacy()).debts,[
  {title:old.title,amount:old.amount},
  {title:foreign.title,amount:foreign.amount,currency:'AUD'},
 ]);
 assert.throws(()=>validateDetails([{...foreign,currency:'JPY'}]));
 assert.throws(()=>validateDetails([{...foreign,amount:1.001}]));
 assert.throws(()=>validateDetails([{...foreign,currency:'VND'}]));
});

test('exchange rates use a common base and round only to target currency precision',()=>{
 const rates={USD:1,AUD:1.46,EUR:0.91,VND:25000};
 assert.equal(convertAmount(1,'USD','AUD',rates),1.46);
 assert.equal(convertAmount(146,'AUD','EUR',rates),91);
 assert.equal(convertAmount(0.01,'USD','VND',rates),250);
});

test('rate reader shares a request and refreshes after the configured interval',async()=>{
 let now=Date.parse('2026-11-07T00:00:00Z');
 let requests=0;
 const read=createRateReader({
  apiKey:'test-key',now:()=>now,
  request:async (_url,{headers})=>{
   assert.equal(headers.apikey,'test-key');
   requests++;
   return {ok:true,json:async()=>({
    meta:{last_updated_at:new Date(now).toISOString()},
    data:{USD:{value:1},AUD:{value:1.46},EUR:{value:0.91},VND:{value:25000}},
   })};
  },
 });
 const [first,second]=await Promise.all([read(),read()]);
 assert.equal(first,second);
 assert.equal(requests,1);
 assert.equal(first.source,'currencyapi');
 assert.equal(first.rates.AUD,1.46);
 now+=59000;
 assert.equal(await read(),first);
 now+=1000;
 assert.notEqual((await read()).updatedAt,first.updatedAt);
 assert.equal(requests,2);
});
