import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {openDatabase} from '../database.mjs';
import {createAuth} from '../auth.mjs';
import {createModeration} from '../moderation.mjs';

export async function migrateLocal({accountsDatabase,cardsDatabase,targetDatabase}){
 const auth=await createAuth({database:targetDatabase}),moderation=await createModeration({database:targetDatabase});
 await auth.close();await moderation.close();
 const sources=[
  {file:accountsDatabase,tables:['accounts','nicknames','profile_settings','account_blocks','member_notifications','safety_events']},
  {file:cardsDatabase,tables:['debt_submissions','admin_members']}
 ];
 const imported={},target=openDatabase(targetDatabase);
 try{await target.transaction(async tx=>{
  for(const {file,tables} of sources){const source=new DatabaseSync(file,{readOnly:true});
   try{for(const table of tables){
    if(!source.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table))continue;
    const columns=source.prepare('PRAGMA table_info('+table+')').all().map(row=>row.name);
    if(columns.some(column=>!/^\w+$/.test(column)))throw Error('Unexpected migration column.');
    let added=0;
    for(const row of source.prepare('SELECT * FROM '+table).all()){
     const result=await tx.prepare('INSERT OR IGNORE INTO '+table+' ('+columns.join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')').run(...columns.map(column=>row[column]));
     if(!result.changes){const existing=await tx.prepare('SELECT * FROM '+table+' WHERE '+columns.map(column=>column+' IS ?').join(' AND ')).get(...columns.map(column=>row[column]));if(!existing)throw Error('Migration conflict in '+table+'; existing cloud data was not changed.');}
     added+=Number(result.changes);
    }imported[table]=added;
   }}finally{source.close();}
  }
 });return imported;}finally{await target.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 if(!process.env.TURSO_DATABASE_URL||!process.env.TURSO_AUTH_TOKEN)throw Error('Load the linked project Turso environment first.');
 const folder=path.resolve(import.meta.dirname,'../.runtime');
 const result=await migrateLocal({accountsDatabase:path.join(folder,'accounts.sqlite'),cardsDatabase:path.join(folder,'cards.sqlite'),targetDatabase:{url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN}});
 console.log('Imported record counts (existing sessions were not migrated):',JSON.stringify(result));
}
