import {test} from 'node:test';import assert from 'node:assert/strict';import {createAuth} from './auth.mjs';
test('blocking expires sessions, stops email and nickname login, and unblocking requires a new session',async t=>{
 let code;const auth=(await createAuth({database:':memory:',send:async d=>{code=d.code;}}));t.after(async ()=>(await auth.close()));
 const request=await auth.request({purpose:'signup',email:'test@example.com',name:'Test Member',gender:'other',age:25,phone:'+84912345678'}),member=(await auth.verify(request.id,code));
 (await auth.setBlocked(member.user.id,{blocked:true,reason:'Please contact support to clarify your card.',actor:'admin'}));
 assert.equal((await auth.session(member.token)),null);
 assert.equal((await auth.isBlocked(member.user.id)),true);
 assert.equal((await auth.memberDirectory()).find(u=>u.id===member.user.id).blocked,true);
 (await auth.setBlocked(member.user.id,{blocked:false,reason:'Reviewed',actor:'admin'}));assert.equal((await auth.session(member.token)),null);
 const nick=(await auth.nicknameSignup({nickname:'SafetyTest',password:'strong-password'}));(await auth.setBlocked(nick.user.id,{blocked:true,reason:'Review needed',actor:'admin'}));
 (await assert.rejects(async ()=>(await auth.nicknameLogin({nickname:'SafetyTest',password:'strong-password'})),/chặn/i));
 (await assert.rejects(async ()=>(await auth.setBlocked('missing',{blocked:true,reason:'Review',actor:'admin'})),/tồn tại/i));
});
test('in-app notices are stored for the intended recipient and read status cannot cross accounts',async t=>{
 const auth=(await createAuth({database:':memory:',send:async()=>{}}));t.after(async ()=>(await auth.close()));const a=(await auth.nicknameSignup({nickname:'NoticeOne',password:'strong-password'})),b=(await auth.nicknameSignup({nickname:'NoticeTwo',password:'strong-password'}));
 const notice=(await auth.notify(a.user.id,{message:'Please update your card.',actor:'admin'}));
 assert.equal((await auth.notifications(a.user.id))[0].message,'Please update your card.');assert.deepEqual((await auth.notifications(b.user.id)),[]);
 (await auth.readNotifications(b.user.id,[notice.id]));assert.equal((await auth.notifications(a.user.id))[0].read,false);
 (await auth.readNotifications(a.user.id,[notice.id]));assert.equal((await auth.notifications(a.user.id))[0].read,true);
 (await assert.rejects(async ()=>(await auth.notify(a.user.id,{message:' ',actor:'admin'}))));
 assert.ok(!JSON.stringify((await auth.memberDirectory())).includes('password'));
});

test('blocked email users must prove mailbox ownership before seeing private block reasons',async t=>{
 let code,time=Date.now();const auth=(await createAuth({database:':memory:',send:async d=>{code=d.code;},now:()=>time}));t.after(async ()=>(await auth.close()));
 const first=await auth.request({purpose:'signup',email:'private@example.com',name:'Private',gender:'other',age:25,phone:'+84912345678'}),member=(await auth.verify(first.id,code));
 (await auth.setBlocked(member.user.id,{blocked:true,reason:'Private review reason',actor:'admin'}));time+=61000;
 const challenge=await auth.request({purpose:'login',email:'private@example.com'});
 (await assert.rejects(async ()=>(await auth.verify(challenge.id,code)),/Private review reason/));assert.equal((await auth.session(member.token)),null);
});
