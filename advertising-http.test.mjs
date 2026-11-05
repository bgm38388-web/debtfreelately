import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAuth} from './auth.mjs';
import {createModeration} from './moderation.mjs';
import {createAppServer} from './server.mjs';

test('advertising endpoints and visual preview enforce server-side admin and same-origin checks',async t=>{
 let code;const auth=await createAuth({database:':memory:',send:async mail=>{code=mail.code;}}),moderation=await createModeration({database:':memory:',adminEmails:['admin@example.com']});
 const advertising={snapshot:async()=>({campaigns:[],settings:{live:{enabled:false}},zones:[]}),action:async()=>({saved:true})};
 const server=createAppServer({auth,moderation,advertising,origin:'http://127.0.0.1'});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await new Promise(resolve=>server.close(resolve));await auth.close();await moderation.close();});
 const base='http://127.0.0.1:'+server.address().port;
 async function account(email){const pending=await auth.request({purpose:'signup',email,name:'API Test',gender:'other',age:25,phone:'+84912345678'});return auth.verify(pending.id,code);}
 const member=await account('member@example.com'),admin=await account('admin@example.com');
 const headers=token=>({Cookie:'dfl_session='+token});
 assert.equal((await fetch(base+'/api/admin/ads')).status,401);
 assert.equal((await fetch(base+'/api/admin/ads',{headers:headers(member.token)})).status,403);
 assert.equal((await fetch(base+'/api/admin/ads',{headers:headers(admin.token)})).status,200);
 assert.equal((await fetch(base+'/api/admin/ads/action',{method:'POST',headers:{...headers(admin.token),Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'})).status,403);
 assert.equal((await fetch(base+'/api/admin/ads/creative',{method:'POST',headers:{...headers(member.token),Origin:'http://127.0.0.1','Content-Type':'image/png'},body:'not an image'})).status,403);
 assert.equal((await fetch(base+'/ads-preview')).status,401);
 const preview=await fetch(base+'/ads-preview',{headers:headers(admin.token)});assert.equal(preview.status,200);assert.equal(preview.headers.get('x-frame-options'),'SAMEORIGIN');assert.match(preview.headers.get('content-security-policy'),/frame-ancestors 'self'/);
});

test('isolated public advertising origin never serves private app code or account APIs',async t=>{
 const auth=await createAuth({database:':memory:'}),moderation=await createModeration({database:':memory:'});
 const advertising={publicConfig:async()=>({settings:{enabled:false},zones:[]})};
 const env={AD_PUBLIC_ORIGIN:'https://public.example.com',CANONICAL_APP_ORIGIN:'https://app.example.com'};
 const server=createAppServer({auth,moderation,advertising,origin:'https://public.example.com',env});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await new Promise(resolve=>server.close(resolve));await auth.close();await moderation.close();});
 const base='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(base+'/api/auth/me')).status,404);
 assert.equal((await fetch(base+'/api/admin/ads')).status,404);
 const response=await fetch(base+'/');assert.equal(response.status,200);const html=await response.text();assert.match(html,/public-entry\.mjs/);assert.ok(!html.includes('src="app.mjs"'));
 for(const module of ['public-entry.mjs','public-layout.mjs','how-it-works.mjs','advertising-public.mjs','advertising-consent.mjs'])assert.equal((await fetch(base+'/'+module,{redirect:'manual'})).status,200,module);
 const privateCode=await fetch(base+'/app.mjs',{redirect:'manual'});assert.equal(privateCode.status,308);assert.equal(privateCode.headers.get('location'),'https://app.example.com/app.mjs');
 const deceptive=await fetch(base+'//evil.example/path',{redirect:'manual'});assert.equal(new URL(deceptive.headers.get('location')).origin,'https://app.example.com');
 const config=await fetch(base+'/api/ads/config');assert.equal(config.status,200);assert.equal((await config.json()).canonicalOrigin,'https://app.example.com');
});
