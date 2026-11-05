import {test} from 'node:test';import assert from 'node:assert/strict';import {createAuth} from './auth.mjs';
test('blocking expires sessions, stops email and nickname login, and unblocking requires a new session',async t=>{
 let code;const auth=createAuth({database:':memory:',send:async d=>{code=d.code;}});t.after(()=>auth.close());
 const request=await auth.request({purpose:'signup',email:'test@example.com',name:'Test Member',gender:'other',age:25,phone:'+84912345678'}),member=auth.verify(request.id,code);
 auth.setBlocked(member.user.id,{blocked:true,reason:'Please contact support to clarify your card.',actor:'admin'});
 assert.equal(auth.session(member.token),null);
 assert.equal(auth.isBlocked(member.user.id),true);
 assert.equal(auth.memberDirectory().find(u=>u.id===member.user.id).blocked,true);
 auth.setBlocked(member.user.id,{blocked:false,reason:'Reviewed',actor:'admin'});assert.equal(auth.session(member.token),null);
 const nick=auth.nicknameSignup({nickname:'SafetyTest',password:'strong-password'});auth.setBlocked(nick.user.id,{blocked:true,reason:'Review needed',actor:'admin'});
 assert.throws(()=>auth.nicknameLogin({nickname:'SafetyTest',password:'strong-password'}),/chặn/i);
 assert.throws(()=>auth.setBlocked('missing',{blocked:true,reason:'Review',actor:'admin'}),/tồn tại/i);
});
test('in-app notices are stored for the intended recipient and read status cannot cross accounts',t=>{
 const auth=createAuth({database:':memory:',send:async()=>{}});t.after(()=>auth.close());const a=auth.nicknameSignup({nickname:'NoticeOne',password:'strong-password'}),b=auth.nicknameSignup({nickname:'NoticeTwo',password:'strong-password'});
 const notice=auth.notify(a.user.id,{message:'Please update your card.',actor:'admin'});
 assert.equal(auth.notifications(a.user.id)[0].message,'Please update your card.');assert.deepEqual(auth.notifications(b.user.id),[]);
 auth.readNotifications(b.user.id,[notice.id]);assert.equal(auth.notifications(a.user.id)[0].read,false);
 auth.readNotifications(a.user.id,[notice.id]);assert.equal(auth.notifications(a.user.id)[0].read,true);
 assert.throws(()=>auth.notify(a.user.id,{message:' ',actor:'admin'}));
 assert.ok(!JSON.stringify(auth.memberDirectory()).includes('password'));
});

test('blocked email users must prove mailbox ownership before seeing private block reasons',async t=>{
 let code,time=Date.now();const auth=createAuth({database:':memory:',send:async d=>{code=d.code;},now:()=>time});t.after(()=>auth.close());
 const first=await auth.request({purpose:'signup',email:'private@example.com',name:'Private',gender:'other',age:25,phone:'+84912345678'}),member=auth.verify(first.id,code);
 auth.setBlocked(member.user.id,{blocked:true,reason:'Private review reason',actor:'admin'});time+=61000;
 const challenge=await auth.request({purpose:'login',email:'private@example.com'});
 assert.throws(()=>auth.verify(challenge.id,code),/Private review reason/);assert.equal(auth.session(member.token),null);
});
