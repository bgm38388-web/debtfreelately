import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createAppServer} from './server.mjs';
import {createSandboxPayPal} from './paypal.mjs';

test('webhook verification forwards original JSON and only uses Sandbox hosts',async()=>{
 const payload='{ "id": "WH-123", "resource": {}, "event_type": "TEST" }';
 const calls=[];
 const client=createSandboxPayPal({
  PAYPAL_ENV:'sandbox',PAYPAL_CLIENT_ID:'test-client',PAYPAL_CLIENT_SECRET:'test-secret',PAYPAL_WEBHOOK_ID:'test-hook'
 },async(url,options)=>{
  calls.push({url,options});
  return Response.json(calls.length===1?{access_token:'test-token',expires_in:300}:{verification_status:'SUCCESS'});
 });
 assert.equal(await client.verify({},payload),false);
 assert.equal(calls.length,0);
 const headers=Object.fromEntries(['auth-algo','cert-url','transmission-id','transmission-sig','transmission-time']
  .map(key=>['paypal-'+key,'test-'+key]));
 assert.equal(await client.verify(headers,payload),true);
 assert.ok(calls.every(({url})=>url.startsWith('https://api-m.sandbox.paypal.com/')));
 assert.ok(calls[1].options.body.endsWith('"webhook_event":'+payload+'}'));
 assert.equal(JSON.parse(calls[1].options.body).webhook_id,'test-hook');
});

test('HTTP requires member sessions, admin privileges, same-origin mutations and signed webhooks',async t=>{
 const users={admin:{id:'admin',role:'Broke'},bros:{id:'bros',role:'Bros'}};
 const origin='http://127.0.0.1';
 const events=[];
 const server=createAppServer({origin,
  auth:{session:key=>users[key],allowRequest:async()=>true},
  moderation:{isAdmin:user=>user?.id==='admin',list:async()=>[]},
  paypal:{clientId:'public',verify:async headers=>headers['paypal-transmission-id']==='signed'},
  contributions:{
   eligibility:async()=>({title:'Case',options:[]}),
   history:async()=>[],adminList:async()=>[],audit:async()=>[],
   verifyCreditor:async(actor,input)=>events.push([actor,input]),
   webhook:async event=>events.push(event.id)
  }
 });
 server.listen(0,'127.0.0.1');
 await once(server,'listening');
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=origin+':'+server.address().port+'/api/';
 async function call(path,{user,data,headers={}}={}){
  const response=await fetch(base+path,{method:data?'POST':'GET',headers:{
   ...(user?{Cookie:'dfl_session='+user}:{}),
   ...(data?{'Content-Type':'application/json',Origin:origin}:{}),...headers
  },body:data?JSON.stringify(data):undefined});
  return {status:response.status,data:await response.json()};
 }
 assert.equal((await call('contributions/history')).status,401);
 assert.equal((await call('admin/sandbox/payouts',{user:'bros'})).status,403);
 assert.equal((await call('admin/sandbox/payouts',{user:'admin'})).status,200);
 const input={cardId:'test',debtIndex:0,reference:'test-reference'};
 assert.equal((await call('admin/sandbox/creditor',{user:'admin',data:input,headers:{Origin:'https://other.example'}})).status,403);
 assert.equal((await call('admin/sandbox/creditor',{user:'admin',data:input})).status,200);
 assert.equal((await call('contributions/options?cardId=test&debtIndex=0',{user:'bros'})).data.clientId,'public');
 assert.equal((await call('contributions/webhook',{data:{id:'unsigned'}})).status,401);
 assert.equal((await call('contributions/webhook',{data:{id:'signed'},headers:{'paypal-transmission-id':'signed',Origin:''}})).status,200);
 assert.deepEqual(events,[['admin',input],'signed']);
});
