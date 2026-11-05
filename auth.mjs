import {randomBytes,randomInt,createHash,timingSafeEqual,scryptSync} from 'node:crypto';
import {openDatabase,consumeLimit,rateSchema} from './database.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export async function createAuth({database,send,now=Date.now}){
 const db=openDatabase(database);
 await db.exec(`CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,details TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY,account TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS nicknames (id TEXT PRIMARY KEY,nickname TEXT NOT NULL,key TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,password TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS profile_settings (account TEXT PRIMARY KEY,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS account_blocks (account TEXT PRIMARY KEY,reason TEXT NOT NULL,actor TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS member_notifications (id TEXT PRIMARY KEY,account TEXT NOT NULL,message TEXT NOT NULL,actor TEXT NOT NULL,created_at INTEGER NOT NULL,read_at INTEGER);
 CREATE TABLE IF NOT EXISTS safety_events (id TEXT PRIMARY KEY,account TEXT NOT NULL,action TEXT NOT NULL,reason TEXT NOT NULL,actor TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS auth_challenges (id TEXT PRIMARY KEY,email TEXT NOT NULL,details TEXT,salt TEXT NOT NULL,digest TEXT NOT NULL,expires INTEGER NOT NULL,attempts INTEGER NOT NULL,valid INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS challenges_email ON auth_challenges(email);
 ${rateSchema};`);
 const blocked=(id,connection=db)=>connection.prepare('SELECT reason FROM account_blocks WHERE account=?').get(id);
 async function active(id,connection=db){const block=await blocked(id,connection);if(block)throw Object.assign(Error('Tài khoản đã bị chặn. '+block.reason),{status:403});}
 async function accountExists(id){return Boolean(await db.prepare('SELECT id FROM accounts WHERE id=?').get(id)||await db.prepare('SELECT id FROM nicknames WHERE id=?').get(id));}
 function safetyText(value){if(typeof value!=='string'||!value.trim()||value.trim().length>1000)throw Error('Nhập nội dung từ 1 đến 1.000 ký tự.');return value.trim();}
 const audit=(connection,account,action,reason,actor)=>connection.prepare('INSERT INTO safety_events VALUES (?,?,?,?,?,?)').run(randomBytes(20).toString('hex'),account,action,reason,actor,now());
 async function settings(id,connection=db){return JSON.parse((await connection.prepare('SELECT data FROM profile_settings WHERE account=?').get(id))?.data||'{}');}
 async function user(row,connection=db){if(!row)return null;const d=JSON.parse(row.details);return {id:row.id,email:row.email,name:d.name,age:d.age,nickname:'Broke_'+row.id.slice(0,6),role:d.role||'Broke',emailVerified:true,phone:d.phone,...await settings(row.id,connection)};}
 const nickUser=async(row,connection=db)=>({id:row.id,name:row.nickname,role:'Bros',accountType:'nickname',emailVerified:false,...await settings(row.id,connection)});
 async function makeSession(u,connection=db){await active(u.id,connection);const token=randomBytes(32).toString('hex');await connection.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash(token),u.id,now()+86400000);return {token,user:u};}
 function nickname(value){const name=String(value||'').normalize('NFKC').trim();if(!/^[\p{L}\p{N}_.-]{3,30}$/u.test(name))throw Error('Biệt danh phải có 3–30 ký tự: chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.');return {name,key:name.toLowerCase()};}
 async function clean(){await db.prepare('DELETE FROM sessions WHERE expires<=?').run(now());await db.prepare('DELETE FROM auth_challenges WHERE expires<=?').run(now());await db.prepare('DELETE FROM rate_windows WHERE last_at<?').run(now()-86400000);}
 return {
  async isBlocked(id){return Boolean(await blocked(id));},
  async blockedAccountIds(){return (await db.prepare('SELECT account FROM account_blocks').all()).map(r=>r.account);},
  async memberDirectory(){
   const accounts=await Promise.all((await db.prepare('SELECT * FROM accounts').all()).map(row=>user(row)));
   const nicks=await Promise.all((await db.prepare('SELECT * FROM nicknames').all()).map(row=>nickUser(row)));
   return Promise.all([...accounts,...nicks].map(async u=>{const block=await blocked(u.id);return {id:u.id,name:u.name,nickname:u.nickname||u.name,email:u.email||'',phone:u.phone||'',age:u.age,role:u.role,blocked:Boolean(block),blockReason:block?.reason||''};}));
  },
  async setBlocked(id,{blocked:shouldBlock,reason,actor}){
   if(!await accountExists(id))throw Object.assign(Error('Thành viên không tồn tại.'),{status:404});
   if(typeof shouldBlock!=='boolean')throw Error('Trạng thái chặn không hợp lệ.');const text=safetyText(reason);
   return db.transaction(async tx=>{if(shouldBlock)await tx.prepare('INSERT INTO account_blocks VALUES (?,?,?,?) ON CONFLICT(account) DO UPDATE SET reason=excluded.reason,actor=excluded.actor,created_at=excluded.created_at').run(id,text,actor,now());else await tx.prepare('DELETE FROM account_blocks WHERE account=?').run(id);await tx.prepare('DELETE FROM sessions WHERE account=?').run(id);await audit(tx,id,shouldBlock?'block':'unblock',text,actor);return {ok:true};});
  },
  async notify(id,{message,actor}){if(!await accountExists(id))throw Object.assign(Error('Thành viên không tồn tại.'),{status:404});const text=safetyText(message),notification={id:randomBytes(20).toString('hex'),message:text,createdAt:now(),read:false};await db.transaction(async tx=>{await tx.prepare('INSERT INTO member_notifications (id,account,message,actor,created_at) VALUES (?,?,?,?,?)').run(notification.id,id,text,actor,notification.createdAt);await audit(tx,id,'notify',text,actor);});return notification;},
  async notifications(id){return (await db.prepare('SELECT id,message,created_at AS createdAt,read_at FROM member_notifications WHERE account=? ORDER BY created_at DESC,id DESC LIMIT 100').all(id)).map(({read_at,...row})=>({...row,read:read_at!==null}));},
  async readNotifications(id,ids){if(!Array.isArray(ids)||ids.length>100||ids.some(value=>typeof value!=='string'))throw Error('Danh sách thông báo không hợp lệ.');await db.transaction(async tx=>{for(const noticeId of ids)await tx.prepare('UPDATE member_notifications SET read_at=? WHERE account=? AND id=? AND read_at IS NULL').run(now(),id,noticeId);});return {ok:true};},
  async safetyHistory(id){return db.prepare('SELECT action,reason,actor,created_at AS createdAt FROM safety_events WHERE account=? ORDER BY created_at DESC,rowid DESC LIMIT 30').all(id);},
  async updateProfile(token,input){
   const account=await this.session(token);if(!account)throw Error('Vui lòng đăng nhập để thay đổi cài đặt.');
   const name=String(input.name||'').trim(),address=String(input.address||'').trim(),phone=String(input.phone||'').replace(/[\s().-]/g,''),emailPending=String(input.emailPending||'').trim().toLowerCase(),photo=String(input.photo||'');
   if(name.length<2||name.length>100||address.length>200||(phone&&!/^\+?\d{8,15}$/.test(phone))||(emailPending&&(emailPending.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(emailPending)))||(photo&&(!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(photo)||photo.length>700000)))throw Error('Thông tin hồ sơ hoặc ảnh không hợp lệ.');
   await db.transaction(async tx=>{
    if(account.accountType==='nickname'){const n=nickname(name),existing=await tx.prepare('SELECT id FROM nicknames WHERE key=?').get(n.key);if(existing&&existing.id!==account.id)throw Error('Biệt danh này đã được sử dụng.');await tx.prepare('UPDATE nicknames SET nickname=?,key=? WHERE id=?').run(n.name,n.key,account.id);}
    else{const row=await tx.prepare('SELECT details FROM accounts WHERE id=?').get(account.id),details=JSON.parse(row.details);details.name=name;details.phone=phone;await tx.prepare('UPDATE accounts SET details=? WHERE id=?').run(JSON.stringify(details),account.id);}
    await tx.prepare('INSERT INTO profile_settings VALUES (?,?) ON CONFLICT(account) DO UPDATE SET data=excluded.data').run(account.id,JSON.stringify({address,location:address,phone,photo,emailPending:emailPending===account.email?'':emailPending}));
   });return this.session(token);
  },
  async nicknameSignup(input){
   await clean();const {name,key}=nickname(input.nickname);if(typeof input.password!=='string'||input.password.length<8||input.password.length>128)throw Error('Mật khẩu phải có 8–128 ký tự.');
   const salt=randomBytes(24).toString('hex'),id=randomBytes(20).toString('hex'),digest=scryptSync(input.password,salt,64).toString('hex');
   return db.transaction(async tx=>{if(await tx.prepare('SELECT id FROM nicknames WHERE key=?').get(key))throw Error('Biệt danh này đã được sử dụng. Vui lòng chọn tên khác.');await tx.prepare('INSERT INTO nicknames VALUES (?,?,?,?,?)').run(id,name,key,salt,digest);return makeSession(await nickUser({id,nickname:name},tx),tx);});
  },
  async nicknameLogin(input){
   await clean();const {key}=nickname(input.nickname);
   if(!await consumeLimit(db,'login:'+key,{now:now(),windowMs:900000,maximum:5}))throw Error('Đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.');
   if(typeof input.password!=='string'||input.password.length>128)throw Error('Biệt danh hoặc mật khẩu không đúng.');
   const row=await db.prepare('SELECT * FROM nicknames WHERE key=?').get(key),digest=scryptSync(input.password,row?.salt||'missing-account-salt',64);
   if(!row||!timingSafeEqual(digest,Buffer.from(row.password,'hex')))throw Error('Biệt danh hoặc mật khẩu không đúng.');
   return db.transaction(async tx=>{await tx.prepare('DELETE FROM rate_windows WHERE key=?').run('login:'+key);return makeSession(await nickUser(row,tx),tx);});
  },
  async request(input){
   await clean();const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
   if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Địa chỉ email không hợp lệ.');
   if(!['signup','login'].includes(input.purpose))throw Error('Yêu cầu không hợp lệ.');
   const existing=await db.prepare('SELECT * FROM accounts WHERE email=?').get(email);let details;
   if(input.purpose==='signup'){const age=Number(input.age),name=String(input.name||'').trim(),phone=String(input.phone||'').replace(/[\s().-]/g,'');if(name.length<2||name.length>100||!['male','female','other','undisclosed'].includes(input.gender)||!Number.isInteger(age)||age<1||age>120||!/^\+?\d{8,15}$/.test(phone))throw Error('Vui lòng kiểm tra tên thật, giới tính, tuổi và số điện thoại.');details={name,gender:input.gender,age,phone,role:input.role==='Bros'?'Bros':'Broke'};}
   if(!await consumeLimit(db,'email:'+email,{now:now(),windowMs:3600000,maximum:5,cooldownMs:60000}))throw Error('Vui lòng đợi 60 giây trước khi yêu cầu mã mới hoặc thử lại sau một giờ.');
   const id=randomBytes(24).toString('hex'),salt=randomBytes(24).toString('hex'),code=String(randomInt(100000,1000000)),valid=input.purpose==='signup'||Boolean(existing);
   if(valid)await send({email,code});
   await db.transaction(async tx=>{await tx.prepare('DELETE FROM auth_challenges WHERE email=?').run(email);await tx.prepare('INSERT INTO auth_challenges VALUES (?,?,?,?,?,?,?,?)').run(id,email,details?JSON.stringify(details):null,salt,hash(salt+code),now()+600000,0,valid?1:0);});
   return {id,expiresIn:600,resendAfter:60};
  },
  async verify(id,code){
   await clean();
   // Failed guesses must commit their attempt count rather than roll it back.
   const outcome=await db.transaction(async tx=>{
    const p=await tx.prepare('SELECT * FROM auth_challenges WHERE id=?').get(typeof id==='string'?id:'');
    if(!p)return {error:'Mã đã hết hạn hoặc không hợp lệ. Hãy yêu cầu mã mới.'};
    if(p.expires<=now()){await tx.prepare('DELETE FROM auth_challenges WHERE id=?').run(id);return {error:'Mã đã hết hạn hoặc không hợp lệ. Hãy yêu cầu mã mới.'};}
    const ok=timingSafeEqual(Buffer.from(hash(p.salt+String(code))),Buffer.from(p.digest))&&Boolean(p.valid);
    if(p.attempts+1>=5||ok)await tx.prepare('DELETE FROM auth_challenges WHERE id=?').run(id);else await tx.prepare('UPDATE auth_challenges SET attempts=attempts+1 WHERE id=?').run(id);
    if(!ok)return {error:'Mã xác nhận không đúng. Bạn có tối đa 5 lần thử.'};
    let row=await tx.prepare('SELECT * FROM accounts WHERE email=?').get(p.email);
    if(!row){const accountId=randomBytes(20).toString('hex');await tx.prepare('INSERT INTO accounts VALUES (?,?,?)').run(accountId,p.email,p.details);row=await tx.prepare('SELECT * FROM accounts WHERE id=?').get(accountId);}
    try{return {result:await makeSession(await user(row,tx),tx)};}catch(error){if(error.status===403)return {error:error.message,status:403};throw error;}
   });if(outcome.error)throw Object.assign(Error(outcome.error),{status:outcome.status||400});return outcome.result;
  },
  async session(token){await clean();if(!token)return null;const session=await db.prepare('SELECT account FROM sessions WHERE hash=? AND expires>?').get(hash(token),now());if(!session)return null;await active(session.account);const account=await db.prepare('SELECT * FROM accounts WHERE id=?').get(session.account);if(account)return user(account);const nick=await db.prepare('SELECT * FROM nicknames WHERE id=?').get(session.account);return nick?nickUser(nick):null;},
  async logout(token){if(token)await db.prepare('DELETE FROM sessions WHERE hash=?').run(hash(token));},
  allowRequest:ip=>consumeLimit(db,'http:'+String(ip),{now:now(),windowMs:3600000,maximum:40}),
  close:()=>db.close()
 };
}
export async function sendVerification({email,code}){if(!process.env.RESEND_API_KEY||!process.env.AUTH_FROM_EMAIL)throw Error('Chưa cấu hình dịch vụ gửi email.');const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','User-Agent':'DebtFreeLately/1.0'},body:JSON.stringify({from:process.env.AUTH_FROM_EMAIL,to:[email],subject:'Mã xác nhận DebtFreeLately',text:`Mã xác nhận DebtFreeLately: ${code}\nMã có hiệu lực trong 10 phút. Không chia sẻ mã này với người khác. Nếu bạn không yêu cầu, hãy bỏ qua email này.`}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Không gửi được email. Vui lòng thử lại sau.');}




