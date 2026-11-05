import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createAuth} from './auth.mjs';
import {createModeration} from './moderation.mjs';
import {createAppServer,createRequestHandler} from './server.mjs';
import {createServer} from 'node:http';

test('Vercel pre-parsed request bodies support signup and issue secure HttpOnly cookies',async t=>{
 const auth=await createAuth({database:':memory:'}),moderation=await createModeration({database:':memory:'});
 const handler=createRequestHandler({auth,moderation,origin:'https://app.example.com'});
 const server=createServer(async(req,res)=>{const chunks=[];for await(const chunk of req)chunks.push(chunk);req.body=JSON.parse(Buffer.concat(chunks).toString());return handler(req,res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await auth.close();await moderation.close();});
 const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/auth/nickname-signup',{method:'POST',headers:{Origin:'https://app.example.com','Content-Type':'application/json'},body:JSON.stringify({nickname:'VercelBros',password:'a-secure-test-password'})});
 assert.equal(response.status,200);
 assert.equal((await response.json()).user.name,'VercelBros');
 assert.match(response.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
 assert.match(response.headers.get('set-cookie'),/; Secure/);
});

test('HTTP request limits are shared between separate server instances',async t=>{
 const folder=await mkdtemp(path.join(tmpdir(),'dfl-api-'));
 const database=path.join(folder,'shared.sqlite');
 const auths=await Promise.all([createAuth({database}),createAuth({database})]);
 const moderation=await createModeration({database});
 const servers=auths.map(auth=>createAppServer({auth,moderation,origin:'https://app.example.com'}));
 await Promise.all(servers.map(server=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))));
 t.after(async()=>{await Promise.all(servers.map(server=>new Promise(resolve=>server.close(resolve))));for(const auth of auths)await auth.close();await moderation.close();await rm(folder,{recursive:true,force:true});});
 async function post(index,origin='https://app.example.com'){return fetch('http://127.0.0.1:'+servers[index].address().port+'/api/missing',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});}
 assert.equal((await post(0,'https://evil.example')).status,403);
 for(let i=0;i<40;i++)assert.equal((await post(i%2)).status,404);
 assert.equal((await post(1)).status,429);
});

test('simultaneous duplicate submissions return one durable card without exceeding the pending limit',async t=>{
 const folder=await mkdtemp(path.join(tmpdir(),'dfl-cards-')),database=path.join(folder,'cards.sqlite');
 const a=await createModeration({database}),b=await createModeration({database});
 t.after(async()=>{await a.close();await b.close();await rm(folder,{recursive:true,force:true});});
 const user={id:'owner',name:'Owner',email:'owner@example.com',emailVerified:true};
 const payload={submissionId:crypto.randomUUID(),debts:[{title:'Debt',story:'A test story',amount:10000}],privacy:{}};
 const cards=await Promise.all([a.submit(user,payload),b.submit(user,payload)]);
 assert.equal(cards[0].id,cards[1].id);
 for(let i=0;i<8;i++)await a.submit(user,{...payload,submissionId:crypto.randomUUID()});
 const outcomes=await Promise.allSettled([a.submit(user,{...payload,submissionId:crypto.randomUUID()}),b.submit(user,{...payload,submissionId:crypto.randomUUID()})]);
 assert.equal(outcomes.filter(outcome=>outcome.status==='fulfilled').length,1);
 assert.equal((await b.mine(user)).length,10);
});
