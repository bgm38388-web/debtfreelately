import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createAuth} from './auth.mjs';
import {createModeration} from './moderation.mjs';
import {migrateLocal} from './scripts/migrate-local.mjs';

test('local migration preserves accounts and cards, is repeatable and does not transfer old sessions',async t=>{
 const folder=await mkdtemp(path.join(tmpdir(),'dfl-migrate-'));
 t.after(()=>rm(folder,{recursive:true,force:true}));
 const accountsDatabase=path.join(folder,'accounts.sqlite'),cardsDatabase=path.join(folder,'cards.sqlite'),targetDatabase=path.join(folder,'target.sqlite');
 const auth=await createAuth({database:accountsDatabase});
 const original=await auth.nicknameSignup({nickname:'MigratedBros',password:'secure-test-password'});
 const cards=await createModeration({database:cardsDatabase});
 const card=await cards.submit({id:original.user.id,name:'Member',emailVerified:true},{submissionId:crypto.randomUUID(),debts:[{title:'Debt',amount:10000,story:'Migration story'}],privacy:{}});
 await auth.close();await cards.close();
 await migrateLocal({accountsDatabase,cardsDatabase,targetDatabase});
 await migrateLocal({accountsDatabase,cardsDatabase,targetDatabase});
 const migrated=await createAuth({database:targetDatabase}),moderation=await createModeration({database:targetDatabase});
 try{
  assert.equal(await migrated.session(original.token),null);
  const login=await migrated.nicknameLogin({nickname:'MigratedBros',password:'secure-test-password'});
  assert.equal(login.user.id,original.user.id);
  assert.equal((await moderation.mine(login.user))[0].id,card.id);
 }finally{await migrated.close();await moderation.close();}
});
