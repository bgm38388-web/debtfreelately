import {test} from 'node:test';import assert from 'node:assert/strict';
import {fraudSignals} from './fraud.mjs';
test('fraud signals explain duplicate profiles and copied stories without automatic judgments',()=>{
 const accounts=[{id:'a',name:'Nguyễn An',age:25,phone:'+84912345678'},{id:'b',name:'nguyễn an',age:25,phone:'+84912345678'},{id:'c',name:'Unrelated',age:30,phone:'+84998765432'}];
 const submissions=[{id:'x',ownerId:'a',createdAt:'2026-11-05T01:00:00Z',debts:[{title:'Học phí',story:'Một câu chuyện dài giống nhau để kiểm tra việc sao chép nội dung.',amount:1000}]},{id:'y',ownerId:'b',createdAt:'2026-11-05T01:00:00Z',debts:[{title:'Học phí',story:'Một câu chuyện dài giống nhau để kiểm tra việc sao chép nội dung.',amount:1000}]}];
 const signals=fraudSignals({accounts,submissions,now:Date.parse('2026-11-05T02:00:00Z')});
 assert.ok(signals.some(s=>s.type==='shared-phone'&&s.accountIds.includes('a')&&s.accountIds.includes('b')));
 assert.ok(signals.some(s=>s.type==='matching-profile'));assert.ok(signals.some(s=>s.type==='duplicate-story'));
 assert.ok(!signals.some(s=>s.accountIds.includes('c')));
 assert.deepEqual(accounts.map(a=>a.blocked),[undefined,undefined,undefined]);
});
test('submission bursts use a bounded 24-hour window and ignore common short stories',()=>{
 const now=Date.parse('2026-11-05T02:00:00Z'),submissions=Array.from({length:5},(_,i)=>({id:String(i),ownerId:'a',createdAt:new Date(now-i*1000).toISOString(),debts:[{title:'Debt',story:'Help',amount:1000}]}));
 assert.ok(fraudSignals({accounts:[{id:'a'}],submissions,now}).some(s=>s.type==='submission-burst'));
 assert.deepEqual(fraudSignals({accounts:[{id:'a'}],submissions,now:now+86400001}),[]);
});
