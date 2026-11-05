import {test} from 'node:test';import assert from 'node:assert/strict';import {createAuth} from './auth.mjs';import {createModeration} from './moderation.mjs';import {createAppServer} from './server.mjs';
test('admin safety actions are authorized, audited, private, and blocked cards leave the feed',async t=>{
 let code;const auth=(await createAuth({database:':memory:',send:async data=>{code=data.code;}})),moderation=(await createModeration({database:':memory:',adminEmails:['admin@example.com']}));
 const server=createAppServer({auth,moderation,origin:'http://127.0.0.1'});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await new Promise(resolve=>server.close(resolve));(await auth.close());(await moderation.close());});const base='http://127.0.0.1:'+server.address().port;
 async function call(path,token,data,origin='http://127.0.0.1'){const response=await fetch(base+path,{method:data?'POST':'GET',headers:{...(token?{Cookie:'dfl_session='+token}:{}),...(data?{'Content-Type':'application/json',Origin:origin}:{})},body:data?JSON.stringify(data):undefined});return {status:response.status,data:await response.json()};}
 async function signup(email){const p=await auth.request({purpose:'signup',email,name:'Same Name',gender:'other',age:25,phone:'+84912345678'});return (await auth.verify(p.id,code));}
 const admin=await signup('admin@example.com'),member=await signup('member@example.com'),other=await signup('other@example.com');
 const card=(await moderation.submit(member.user,{submissionId:crypto.randomUUID(),debts:[{title:'Debt',story:'A sufficiently long test story for similarity review.',amount:1000}],privacy:{}}));(await moderation.review(admin.user,card.id,{decision:'approved'}));
 assert.equal((await call('/api/admin/fraud',member.token)).status,403);assert.equal((await call('/api/admin/users',null)).status,401);
 assert.ok((await call('/api/admin/fraud',admin.token)).data.signals.some(s=>s.type==='shared-phone'));
 const search=await call('/api/admin/users?q=same',admin.token);assert.equal(search.status,200);assert.equal(search.data.users.length,3);assert.ok(!JSON.stringify(search).includes('password'));
 const target='/api/admin/users/'+member.user.id;
 assert.equal((await call(target+'/notify',member.token,{message:'No permission'})).status,403);
 assert.equal((await call(target+'/block',admin.token,{blocked:true,reason:'Review'},'https://evil.example')).status,403);
 assert.equal((await call('/api/admin/users/'+admin.user.id+'/block',admin.token,{blocked:true,reason:'Test'})).status,403);
 assert.equal((await call('/api/admin/users/'+admin.user.id+'/block',admin.token,{blocked:false,reason:'Test'})).status,403);
 assert.equal((await call(target+'/notify',admin.token,{message:'Please clarify your card.'})).status,200);
 assert.equal((await call('/api/notifications',member.token)).data.notifications.length,1);assert.equal((await call('/api/notifications',other.token)).data.notifications.length,0);
 assert.equal((await call(target+'/block',admin.token,{blocked:true,reason:'Review needed'})).status,200);
 assert.equal((await call('/api/cards')).data.cards.length,0);assert.equal((await call('/api/auth/me',member.token)).status,401);
 assert.equal((await call(target+'/history',admin.token)).data.events[0].action,'block');
 assert.equal((await call(target+'/block',admin.token,{blocked:false,reason:'Resolved'})).status,200);assert.equal((await call('/api/cards')).data.cards.length,1);
 let last;for(let i=0;i<102;i++)last=await signup('extra'+i+'@example.com');(await auth.setBlocked(last.user.id,{blocked:true,reason:'Review needed',actor:admin.user.id}));
 const blockedList=await call('/api/admin/users?blocked=1',admin.token);assert.equal(blockedList.data.users.length,1);assert.equal(blockedList.data.users[0].id,last.user.id);
});
