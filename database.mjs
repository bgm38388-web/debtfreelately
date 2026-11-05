import {DatabaseSync} from 'node:sqlite';
import {createClient} from '@libsql/client/web';

const localQueues=new Map();
export function openDatabase(database){
 if(!database)throw Error('Database configuration is required.');
 if(typeof database==='object'){
  const client=createClient(database);
  const wrap=connection=>({
   prepare(sql){return {
    async get(...args){return (await connection.execute({sql,args})).rows[0];},
    async all(...args){return (await connection.execute({sql,args})).rows;},
    async run(...args){const result=await connection.execute({sql,args});return {changes:result.rowsAffected};}
   };},
   async exec(sql){await connection.executeMultiple(sql);}
  });
  return {...wrap(client),async transaction(fn){const tx=await client.transaction('write');try{const result=await fn(wrap(tx));await tx.commit();return result;}catch(error){await tx.rollback();throw error;}finally{tx.close();}},close(){client.close();}};
 }
 const db=new DatabaseSync(database);db.exec('PRAGMA busy_timeout=5000');
 const key=database===':memory:'?db:database;
 async function locked(fn){const previous=localQueues.get(key)||Promise.resolve();let release;const next=new Promise(resolve=>{release=resolve;});localQueues.set(key,next);await previous;try{return await fn();}finally{release();if(localQueues.get(key)===next)localQueues.delete(key);}}
 const direct={prepare(sql){const statement=db.prepare(sql);return {get:(...args)=>statement.get(...args),all:(...args)=>statement.all(...args),run:(...args)=>statement.run(...args)};},exec:sql=>db.exec(sql)};
 return {
  prepare(sql){return {get:(...args)=>locked(()=>direct.prepare(sql).get(...args)),all:(...args)=>locked(()=>direct.prepare(sql).all(...args)),run:(...args)=>locked(()=>direct.prepare(sql).run(...args))};},
  exec:sql=>locked(()=>db.exec(sql)),
  transaction:fn=>locked(async()=>{db.exec('BEGIN IMMEDIATE');try{const result=await fn(direct);db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}),
  close:()=>locked(()=>db.close())
 };
}

export async function consumeLimit(db,key,{now=Date.now(),windowMs,maximum,cooldownMs=0}){
 return db.transaction(async tx=>{
  const row=await tx.prepare('SELECT since,count,last_at FROM rate_windows WHERE key=?').get(key);
  const current=row&&now-row.since<windowMs?row:{since:now,count:0,last_at:0};
  if(current.count>=maximum||(row&&now-row.last_at<cooldownMs))return false;
  await tx.prepare('INSERT INTO rate_windows (key,since,count,last_at) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET since=excluded.since,count=excluded.count,last_at=excluded.last_at').run(key,current.since,current.count+1,now);
  return true;
 });
}
export const rateSchema='CREATE TABLE IF NOT EXISTS rate_windows (key TEXT PRIMARY KEY,since INTEGER NOT NULL,count INTEGER NOT NULL,last_at INTEGER NOT NULL)';
