import test from 'node:test';
import assert from 'node:assert/strict';
import {createSandboxPayPal} from './paypal.mjs';
import {createContributions} from './contributions.mjs';

test('live and incomplete configurations cannot initialize PayPal', () => {
 const keys={PAYPAL_CLIENT_ID:'client',PAYPAL_CLIENT_SECRET:'secret',PAYPAL_WEBHOOK_ID:'webhook'};
 assert.equal(createSandboxPayPal({...keys,PAYPAL_ENV:'live'}),null);
 assert.equal(createSandboxPayPal({PAYPAL_ENV:'sandbox'}),null);
});

test('verified case, server pricing, ownership, capture, event deduplication and payout audit',async t=>{
 const calls=[];
 const capture={id:'CAPTURE1',status:'COMPLETED',amount:{currency_code:'AUD',value:'5.00'},seller_receivable_breakdown:{paypal_fee:{currency_code:'AUD',value:'0.60'}}};
 const paypal={
  async create(row){calls.push(row);return {id:'ORDER1',status:'CREATED'};},
  async capture(){return capture;},
  async verify(){return true;}
 };
 const store=await createContributions({database:':memory:',paypal,
  debt:async(id,index)=>id==='card'&&index===0?{ownerId:'broke',title:'Tuition'}:null});
 t.after(()=>store.close());
 const bros={id:'bros',role:'Bros'};
 const input={cardId:'card',debtIndex:0,option:'AUD-small',requestId:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',amount:1};
 await assert.rejects(store.create(bros,input),{status:409});
 await store.verifyCreditor('admin',{cardId:'card',debtIndex:0,reference:'verification-record'});
 const order=await store.create(bros,input);
 assert.equal(calls[0].gross_minor,500);
 assert.equal(order.orderId,'ORDER1');
 await store.create(bros,input);
 assert.equal(calls.length,1);
 await assert.rejects(store.capture({id:'other',role:'Bros'},order.orderId),{status:404});
 const paid=await store.capture(bros,order.orderId);
 assert.equal(paid.status,'completed');
 assert.equal(paid.feeMinor,60);
 assert.equal((await store.history({id:'broke',role:'Broke'})).length,1);
 await store.payout('admin',paid.id,{action:'approve',reference:'review'});
 const event={id:'WH-1',event_type:'PAYMENT.CAPTURE.REFUNDED',resource:{id:'REF1',status:'COMPLETED',amount:{currency_code:'AUD',value:'5.00'},links:[{rel:'up',href:'https://api-m.sandbox.paypal.com/v2/payments/captures/CAPTURE1'}]}};
 await store.webhook(event);
 await store.webhook(event);
 await store.webhook({id:'WH-2',event_type:'PAYMENT.CAPTURE.COMPLETED',resource:{...capture,supplementary_data:{related_ids:{order_id:'ORDER1'}}}});
 const [record]=await store.history(bros);
 assert.equal(record.status,'refunded');
 assert.equal(record.payoutStatus,'held');
 assert.equal((await store.audit()).filter(item=>item.action==='refunded').length,1);
 await assert.rejects(store.payout('admin',paid.id,{action:'confirm_receipt',reference:'receipt'}),{status:409});
});

test('pending captures reconcile, disputes hold payouts, and simulated receipts require approval',async t=>{
 const amount={currency_code:'JPY',value:'500'};
 const capture={id:'C-2',status:'PENDING',amount};
 const paypal={
  create:async row=>({id:'ORDER-'+row.debt_index}),
  capture:async row=>({...capture,id:'C-'+row.debt_index})
 };
 const store=await createContributions({database:':memory:',paypal,debt:async()=>({ownerId:'broke',title:'Test case'})});
 t.after(()=>store.close());
 const bros={id:'bros',role:'Bros'};
 for(const debtIndex of [1,2]){
  await store.verifyCreditor('admin',{cardId:'case',debtIndex,reference:'verification'});
  const order=await store.create(bros,{cardId:'case',debtIndex,option:'JPY-small',requestId:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee'+debtIndex});
  const pending=await store.capture(bros,order.orderId);
  assert.equal(pending.status,'pending');
  await assert.rejects(store.payout('admin',pending.id,{action:'approve',reference:'approval'}),{status:409});
  await store.webhook({id:'event-'+debtIndex,event_type:'PAYMENT.CAPTURE.COMPLETED',resource:{
   id:pending.captureId,amount,supplementary_data:{related_ids:{order_id:order.orderId}}
  }});
  await assert.rejects(store.payout('admin',pending.id,{action:'confirm_receipt',reference:'receipt'}),{status:409});
  await store.payout('admin',pending.id,{action:'approve',reference:'approval'});
  if(debtIndex===1){
   assert.equal((await store.payout('admin',pending.id,{action:'fail',reference:'simulated-failure'})).payoutStatus,'failed');
   await store.payout('admin',pending.id,{action:'approve',reference:'review-again'});
   assert.equal((await store.payout('admin',pending.id,{action:'confirm_receipt',reference:'simulated-receipt'})).payoutStatus,'receipt_confirmed');
  }else{
   const resource={disputed_transactions:[{seller_transaction_id:pending.captureId}]};
   await store.webhook({id:'dispute-resolved',event_type:'CUSTOMER.DISPUTE.RESOLVED',create_time:'2026-11-13T05:10:00Z',resource});
   await store.webhook({id:'dispute-created',event_type:'CUSTOMER.DISPUTE.CREATED',create_time:'2026-11-13T05:00:00Z',resource});
   const held=(await store.history(bros)).find(row=>row.id===pending.id);
   assert.equal(held.disputeStatus,'resolved');
   assert.equal(held.payoutStatus,'held');
   await assert.rejects(store.payout('admin',held.id,{action:'confirm_receipt',reference:'receipt'}),{status:409});
  }
 }
});
