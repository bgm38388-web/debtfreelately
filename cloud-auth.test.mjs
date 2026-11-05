import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createAuth} from './auth.mjs';

const person={purpose:'signup',name:'Cloud Test',gender:'other',age:25,phone:'+84912345678',email:'cloud@example.com'};
test('an OTP expiring while verification is in progress cannot create a session',async t=>{
 let clock=1000000,step=0,code;
 const auth=await createAuth({database:':memory:',now:()=>{clock+=step;return clock;},send:async mail=>{code=mail.code;}});
 t.after(()=>auth.close());
 const pending=await auth.request(person);
 clock=1599995;step=2;
 await assert.rejects(auth.verify(pending.id,code),/hết hạn|không hợp lệ/);
});
async function instances(t){
 const folder=await mkdtemp(path.join(tmpdir(),'dfl-cloud-'));let code;
 const options={database:path.join(folder,'accounts.sqlite'),send:async mail=>{code=mail.code;}};
 const a=await createAuth(options),b=await createAuth(options);
 t.after(async()=>{await a.close();await b.close();await rm(folder,{recursive:true,force:true});});
 return {a,b,get code(){return code;}};
}
test('email verification survives another instance and an OTP can only be consumed once',async t=>{
 const s=await instances(t),pending=await s.a.request(person);
 const verified=await s.b.verify(pending.id,s.code);
 assert.equal(verified.user.email,person.email);
 const next=await s.a.request({...person,email:'concurrent@example.com'});
 const outcomes=await Promise.allSettled([Promise.resolve().then(()=>s.a.verify(next.id,s.code)),Promise.resolve().then(()=>s.b.verify(next.id,s.code))]);
 assert.equal(outcomes.filter(result=>result.status==='fulfilled').length,1);
 const account=outcomes.find(result=>result.status==='fulfilled').value;
 assert.equal((await s.b.session(account.token)).email,'concurrent@example.com');
 await assert.rejects(async()=>s.b.verify(pending.id,s.code));
 await s.b.logout(account.token);
 assert.equal(await s.a.session(account.token),null);
});
test('resend cooldown and password lockout are shared between instances',async t=>{
 const s=await instances(t);
 await s.a.request(person);
 await assert.rejects(s.b.request(person),/60/);
 await s.a.nicknameSignup({nickname:'SharedBros',password:'a-secure-test-password'});
 for(let i=0;i<5;i++)await assert.rejects(async()=>s.a.nicknameLogin({nickname:'SharedBros',password:'wrong'}));
 await assert.rejects(async()=>s.b.nicknameLogin({nickname:'SharedBros',password:'a-secure-test-password'}),/15/);
});
