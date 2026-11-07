import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createAuth} from './auth.mjs';

test('signup photos are validated and become editable profile settings', async t => {
 const photo='/assets/avatar-sprout.svg';
 const uploaded='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCuoAAAAASUVORK5CYII=';
 let code;
 const auth=await createAuth({database:':memory:',send:async mail=>{code=mail.code;}});
 t.after(()=>auth.close());
 const person={name:'New Member',gender:'other',age:25,phone:'+84912345678',email:'new@example.com',purpose:'signup'};
 await assert.rejects(auth.request({...person,photo:'https://example.com/photo.svg'}),/ảnh/i);
 const challenge=await auth.request({...person,photo});
 const account=await auth.verify(challenge.id,code);
 assert.equal(account.user.gender,'other');
 assert.equal((await auth.session(account.token)).photo,photo);
 assert.equal((await auth.updateProfile(account.token,{name:person.name,photo:uploaded})).photo,uploaded);
 assert.equal((await auth.updateProfile(account.token,{name:person.name,photo:''})).photo,'');
 const nickname=await auth.nicknameSignup({nickname:'NewBros',password:'a-test-password',photo:uploaded});
 assert.equal((await auth.session(nickname.token)).photo,uploaded);
 assert.equal((await auth.updateProfile(nickname.token,{name:'NewBros',photo})).photo,photo);
});
