import {randomUUID} from 'node:crypto';
import {openDatabase} from './database.mjs';

const prices={AUD:[500,1000,2500],USD:[500,1000,2500],EUR:[500,1000,2500],GBP:[500,1000,2500],
 CAD:[500,1000,2500],NZD:[500,1000,2500],SGD:[500,1000,2500],JPY:[500,1000,2500]};
export const options=Object.entries(prices).flatMap(([currency,amounts])=>amounts.map((grossMinor,index)=>({
 id:currency+'-'+['small','medium','large'][index],currency,grossMinor,digits:currency==='JPY'?0:2
})));
const fail=(status,message)=>Object.assign(Error(message),{status});
const paymentStates={COMPLETED:'completed',PENDING:'pending',DECLINED:'failed',DENIED:'failed',FAILED:'failed',
 REFUNDED:'refunded',PARTIALLY_REFUNDED:'partially_refunded'};
const captureEvents={'PAYMENT.CAPTURE.COMPLETED':'completed','PAYMENT.CAPTURE.PENDING':'pending',
 'PAYMENT.CAPTURE.DENIED':'failed','PAYMENT.CAPTURE.DECLINED':'failed','PAYMENT.CAPTURE.REVERSED':'reversed'};
const captureIdPattern=/^[A-Za-z0-9-]{1,64}$/;
function moneyMinor(amount,currency){
 if(amount?.currency_code!==currency||typeof amount.value!=='string'||!/^\d{1,10}(\.\d{1,2})?$/.test(amount.value))return null;
 const [whole,fraction='']=amount.value.split('.');
 if(currency==='JPY')return Number(fraction)===0?Number(whole):null;
 return Number(whole)*100+Number(fraction.padEnd(2,'0'));
}
function record(row){
 return {id:row.id,cardId:row.card_id,debtIndex:row.debt_index,title:row.title,orderId:row.order_id,captureId:row.capture_id,
  currency:row.currency,grossMinor:row.gross_minor,feeMinor:row.fee_minor,status:row.status,
  webhookConfirmed:Boolean(row.webhook_confirmed),disputeStatus:row.dispute_status,payoutStatus:row.payout_status,createdAt:row.created_at};
}
function requireBros(user){
 if(!user?.id)throw fail(401,'Sign in to use Sandbox Checkout.');
 if(user.role!=='Bros')throw fail(403,'Only Bros can make a contribution.');
}
function checkCase(input){
 const {cardId,debtIndex}=input||{};
 if(typeof cardId!=='string'||!/^[\w-]{1,64}$/.test(cardId)||!Number.isInteger(debtIndex)||debtIndex<0||debtIndex>=20)
  throw fail(400,'Invalid debt case.');
}
function reference(value){
 if(typeof value!=='string'||!value.trim()||value.length>240)throw fail(400,'Enter a reference of 1–240 characters.');
 return value.trim();
}
function refundCapture(resource){
 const link=Array.isArray(resource.links)&&resource.links.find(item=>item.rel==='up');
 if(!link||typeof link.href!=='string')return null;
 return link.href.match(/^https:\/\/api(?:-m)?\.sandbox\.paypal\.com\/v2\/payments\/captures\/([\w-]+)$/)?.[1];
}

export async function createContributions({database,paypal,debt}){
 const db=openDatabase(database);
 try{await db.exec(`
 CREATE TABLE IF NOT EXISTS sandbox_creditors(
  card_id TEXT NOT NULL,debt_index INTEGER NOT NULL,broke_id TEXT NOT NULL,reference TEXT NOT NULL,
  verified_by TEXT NOT NULL,verified_at TEXT NOT NULL,PRIMARY KEY(card_id,debt_index));
 CREATE TABLE IF NOT EXISTS sandbox_contributions(
  id TEXT PRIMARY KEY,bros_id TEXT NOT NULL,broke_id TEXT NOT NULL,card_id TEXT NOT NULL,debt_index INTEGER NOT NULL,
  title TEXT NOT NULL,request_id TEXT NOT NULL,option_id TEXT NOT NULL,currency TEXT NOT NULL,gross_minor INTEGER NOT NULL,
  order_id TEXT UNIQUE,capture_id TEXT UNIQUE,fee_minor INTEGER,status TEXT NOT NULL DEFAULT 'creating',
  payout_status TEXT NOT NULL DEFAULT 'unreviewed',dispute_status TEXT,dispute_at TEXT,
  created_at TEXT NOT NULL, UNIQUE(bros_id,request_id));
 CREATE INDEX IF NOT EXISTS sandbox_history_bros ON sandbox_contributions(bros_id,created_at);
 CREATE INDEX IF NOT EXISTS sandbox_history_broke ON sandbox_contributions(broke_id,created_at);
 CREATE TABLE IF NOT EXISTS sandbox_paypal_events(id TEXT PRIMARY KEY,received_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sandbox_refunds(id TEXT PRIMARY KEY,contribution_id TEXT NOT NULL,amount_minor INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sandbox_audit(
  id INTEGER PRIMARY KEY,actor TEXT NOT NULL,subject TEXT NOT NULL,action TEXT NOT NULL,reference TEXT NOT NULL,at TEXT NOT NULL);
 `);}catch(error){await db.close();throw error;}
 const now=()=>new Date().toISOString();
 const byId=(tx,id)=>tx.prepare('SELECT * FROM sandbox_contributions WHERE id=?').get(id);
 const byCapture=(tx,id)=>tx.prepare('SELECT * FROM sandbox_contributions WHERE capture_id=?').get(id);
 const byOrder=(tx,id)=>tx.prepare('SELECT * FROM sandbox_contributions WHERE order_id=?').get(id);
 const creditor=(tx,card,index)=>tx.prepare('SELECT * FROM sandbox_creditors WHERE card_id=? AND debt_index=?').get(card,index);
 const log=(tx,actor,subject,action,ref)=>tx.prepare('INSERT INTO sandbox_audit(actor,subject,action,reference,at) VALUES (?,?,?,?,?)').run(actor,subject,action,ref,now());
 async function eligible(input){
  checkCase(input);
  const target=await debt(input.cardId,input.debtIndex);
  const verified=await creditor(db,input.cardId,input.debtIndex);
  if(!target||verified?.broke_id!==target.ownerId)throw fail(409,'Sandbox Checkout requires a verified debt case and creditor.');
  return target;
 }
 async function captureUpdate(tx,row,capture,status){
  if(!status||typeof capture.id!=='string'||!captureIdPattern.test(capture.id)||moneyMinor(capture.amount,row.currency)!==row.gross_minor||
    (row.capture_id&&row.capture_id!==capture.id))throw fail(422,'Capture does not match the contribution.');
  const allowed={creating:['pending','completed','failed'],awaiting_approval:['pending','completed','failed'],
   pending:['completed','failed'],failed:['completed'],completed:['partially_refunded','refunded','reversed'],
   partially_refunded:['refunded','reversed']};
  const next=allowed[row.status]?.includes(status)?status:row.status;
  const fee=moneyMinor(capture.seller_receivable_breakdown?.paypal_fee,row.currency);
  const hold=['partially_refunded','refunded','reversed'].includes(next);
  await tx.prepare(`UPDATE sandbox_contributions SET capture_id=?,fee_minor=COALESCE(?,fee_minor),status=?,
   payout_status=CASE WHEN ? AND payout_status<>'receipt_confirmed' THEN 'held' ELSE payout_status END WHERE id=?`)
   .run(capture.id,fee,next,Number(hold),row.id);
  return record(await byId(tx,row.id));
 }
 return {
  clientId:paypal.clientId,
  async eligibleDebts(user,cardId){
   requireBros(user);
   checkCase({cardId,debtIndex:0});
   const verified=await db.prepare('SELECT debt_index,broke_id FROM sandbox_creditors WHERE card_id=? ORDER BY debt_index').all(cardId);
   const indexes=[];
   for(const row of verified){
    const target=await debt(cardId,row.debt_index);
    if(target?.ownerId===row.broke_id&&target.ownerId!==user.id)indexes.push(row.debt_index);
   }
   return indexes;
  },
  async eligibility(user,input){requireBros(user);const target=await eligible(input);return {title:target.title,options};},
  async create(user,input){
   requireBros(user);
   const price=options.find(item=>item.id===input?.option);
   if(!price||typeof input.requestId!=='string'||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(input.requestId))
    throw fail(400,'Invalid contribution option or request ID.');
   const target=await eligible(input);
   if(user.id===target.ownerId)throw fail(409,'You cannot contribute to your own case.');
   const row=await db.transaction(async tx=>{
    const lookup=()=>tx.prepare('SELECT * FROM sandbox_contributions WHERE bros_id=? AND request_id=?').get(user.id,input.requestId);
    const existing=await lookup();
    if(existing){
     if(existing.card_id!==input.cardId||existing.debt_index!==input.debtIndex||existing.option_id!==price.id)
      throw fail(409,'This request ID already belongs to another contribution.');
     return existing;
    }
    await tx.prepare(`INSERT INTO sandbox_contributions
     (id,bros_id,broke_id,card_id,debt_index,title,request_id,option_id,currency,gross_minor,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(randomUUID(),user.id,target.ownerId,input.cardId,input.debtIndex,target.title,
     input.requestId,price.id,price.currency,price.grossMinor,now());
    return lookup();
   });
   if(row.order_id)return record(row);
   // PayPal retains request IDs for a limited window. Never replay a stale create.
   if(Date.now()-Date.parse(row.created_at)>30*60*1000)throw fail(409,'This checkout attempt expired.');
   const order=await paypal.create(row);
   if(typeof order.id!=='string'||!captureIdPattern.test(order.id))throw fail(502,'Invalid PayPal Sandbox order.');
   await db.prepare("UPDATE sandbox_contributions SET order_id=?,status='awaiting_approval' WHERE id=? AND order_id IS NULL").run(order.id,row.id);
   return record(await byId(db,row.id));
  },
  async capture(user,orderId){
   requireBros(user);
   if(typeof orderId!=='string'||!captureIdPattern.test(orderId))throw fail(400,'Invalid PayPal order ID.');
   const row=await byOrder(db,orderId);
   if(!row||row.bros_id!==user.id)throw fail(404,'Sandbox order not found.');
   if(row.capture_id)return record(row);
   await eligible({cardId:row.card_id,debtIndex:row.debt_index});
   const captured=await paypal.capture(row);
   return db.transaction(async tx=>captureUpdate(tx,await byId(tx,row.id),captured,paymentStates[captured.status]));
  },
  async webhook(event){
   if(typeof event?.id!=='string'||event.id.length>128||!event.id||!event.resource||typeof event.event_type!=='string')
    throw fail(400,'Invalid PayPal event.');
   const {id,event_type:type,resource}=event;
   return db.transaction(async tx=>{
    if(await tx.prepare('SELECT id FROM sandbox_paypal_events WHERE id=?').get(id))return;
    if(Object.hasOwn(captureEvents,type)){
     const orderId=resource.supplementary_data?.related_ids?.order_id;
     const row=(orderId&&await byOrder(tx,orderId))||(resource.id&&await byCapture(tx,resource.id));
     if(row){
      if(type==='PAYMENT.CAPTURE.REVERSED'){
       if(!row.capture_id||row.capture_id!==resource.id)throw fail(409,'Capture reconciliation pending.');
       await tx.prepare(`UPDATE sandbox_contributions SET status='reversed',payout_status=
        CASE WHEN payout_status='receipt_confirmed' THEN payout_status ELSE 'held' END WHERE id=?`).run(row.id);
      }else{
       const updated=await captureUpdate(tx,row,resource,captureEvents[type]);
       if(type==='PAYMENT.CAPTURE.COMPLETED'&&updated.status==='completed')
        await log(tx,'paypal',row.id,'capture_webhook_confirmed',id);
      }
     }else if(orderId||resource.id)throw fail(409,'Capture reconciliation pending.');
    }
    if(type==='PAYMENT.CAPTURE.REFUNDED'&&resource.status==='COMPLETED'){
     const captureId=resource.supplementary_data?.related_ids?.capture_id||refundCapture(resource);
     const row=captureId&&await byCapture(tx,captureId);
     if(!row)throw fail(409,'Refund reconciliation pending.');
     const amount=moneyMinor(resource.amount,row.currency);
     if(!resource.id||!amount||amount>row.gross_minor)throw fail(422,'Refund does not match contribution.');
     const added=await tx.prepare('INSERT INTO sandbox_refunds VALUES (?,?,?) ON CONFLICT(id) DO NOTHING').run(resource.id,row.id,amount);
     if(added.changes){
      const {total}=await tx.prepare('SELECT SUM(amount_minor) AS total FROM sandbox_refunds WHERE contribution_id=?').get(row.id);
      const status=total>=row.gross_minor?'refunded':'partially_refunded';
      await tx.prepare(`UPDATE sandbox_contributions SET status=CASE WHEN status='reversed' THEN status ELSE ? END,
       payout_status=CASE WHEN payout_status='receipt_confirmed' THEN payout_status ELSE 'held' END WHERE id=?`).run(status,row.id);
      await log(tx,'paypal',row.id,status,id);
     }
    }
    if(['CUSTOMER.DISPUTE.CREATED','CUSTOMER.DISPUTE.UPDATED','CUSTOMER.DISPUTE.RESOLVED'].includes(type)){
     const at=resource.update_time||event.create_time;
     if(typeof at!=='string'||!Number.isFinite(Date.parse(at))||!Array.isArray(resource.disputed_transactions))throw fail(422,'Invalid dispute event.');
     for(const transaction of resource.disputed_transactions){
      const captureId=transaction.seller_transaction_id;
      const row=captureId&&await byCapture(tx,captureId);
      if(!row&&captureId)throw fail(409,'Dispute reconciliation pending.');
      if(!row)continue;
      const timestamp=new Date(at).toISOString();
      const status=type.endsWith('.RESOLVED')?'resolved':'open';
      await tx.prepare(`UPDATE sandbox_contributions SET dispute_status=?,dispute_at=?,payout_status=
       CASE WHEN payout_status='receipt_confirmed' THEN payout_status ELSE 'held' END
       WHERE id=? AND (dispute_at IS NULL OR dispute_at<? OR (dispute_at=? AND dispute_status<>'resolved'))`)
       .run(status,timestamp,row.id,timestamp,timestamp);
     }
    }
    await tx.prepare('INSERT INTO sandbox_paypal_events VALUES (?,?)').run(id,now());
   });
  },
  async history(user){
   if(!user?.id)throw fail(401,'Sign in to view contributions.');
   const column=user.role==='Bros'?'bros_id':'broke_id';
   return (await db.prepare(`SELECT *, EXISTS(SELECT 1 FROM sandbox_audit WHERE subject=sandbox_contributions.id AND actor='paypal' AND action='capture_webhook_confirmed') AS webhook_confirmed FROM sandbox_contributions WHERE ${column}=? AND order_id IS NOT NULL ORDER BY created_at DESC LIMIT 100`).all(user.id)).map(record);
  },
  async verifyCreditor(actor,input){
   checkCase(input);
   const ref=reference(input.reference);
   const target=await debt(input.cardId,input.debtIndex);
   if(!target)throw fail(404,'Approved debt case not found.');
   await db.transaction(async tx=>{
    await tx.prepare(`INSERT INTO sandbox_creditors VALUES (?,?,?,?,?,?) ON CONFLICT(card_id,debt_index) DO UPDATE
     SET broke_id=excluded.broke_id,reference=excluded.reference,verified_by=excluded.verified_by,verified_at=excluded.verified_at`)
     .run(input.cardId,input.debtIndex,target.ownerId,ref,actor,now());
    await log(tx,actor,input.cardId+':'+input.debtIndex,'verify_creditor',ref);
   });
  },
  async payout(actor,id,input){
   const {action,reference:ref}=input||{};
   const note=reference(ref);
   if(typeof id!=='string'||!/^[0-9a-f-]{36}$/.test(id))throw fail(400,'Invalid contribution ID.');
   return db.transaction(async tx=>{
    const row=await byId(tx,id);
    if(!row)throw fail(404,'Contribution not found.');
    const verified=await creditor(tx,row.card_id,row.debt_index);
    const transitions={
     approve:[['unreviewed','failed'],'approved'],
     fail:[['approved'],'failed'],
     confirm_receipt:[['approved'],'receipt_confirmed']
    };
    const transition=Object.hasOwn(transitions,action)&&transitions[action];
    if(!transition||!transition[0].includes(row.payout_status)||row.status!=='completed'||
     row.dispute_status||verified?.broke_id!==row.broke_id)throw fail(409,'This Sandbox payout cannot transition.');
    await tx.prepare('UPDATE sandbox_contributions SET payout_status=? WHERE id=?').run(transition[1],row.id);
    await log(tx,actor,row.id,action,note);
    return record(await byId(tx,id));
   });
  },
  async adminList(){
   return (await db.prepare('SELECT * FROM sandbox_contributions WHERE order_id IS NOT NULL ORDER BY created_at DESC LIMIT 100').all())
    .map(row=>({...record(row),brosId:row.bros_id,brokeId:row.broke_id}));
  },
  async audit(){return db.prepare('SELECT * FROM sandbox_audit ORDER BY id DESC LIMIT 100').all();},
  close(){return db.close();}
 };
}
