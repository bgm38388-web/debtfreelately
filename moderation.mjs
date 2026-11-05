import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {defaultPrivacy,validateDetails,publicCard} from './dist/card-model.mjs';

export function createModeration({database,adminEmails=[],now=()=>new Date().toISOString()}){
 const db=new DatabaseSync(database);
 db.exec(`CREATE TABLE IF NOT EXISTS debt_submissions (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, request_id TEXT NOT NULL, created_at TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending', debts TEXT NOT NULL, privacy TEXT NOT NULL, identity TEXT NOT NULL,
 reviewed_at TEXT, reviewer TEXT, reason TEXT NOT NULL DEFAULT '', UNIQUE(owner,request_id));
 CREATE INDEX IF NOT EXISTS submissions_status ON debt_submissions(status,created_at);
 CREATE TABLE IF NOT EXISTS admin_members (email TEXT PRIMARY KEY, granted_by TEXT NOT NULL, granted_at TEXT NOT NULL);`);
 const allowed=new Set(adminEmails.map(s=>s.trim().toLowerCase()).filter(Boolean));
 const isOwner=user=>Boolean(user?.emailVerified===true&&allowed.has(String(user.email||'').trim().toLowerCase()));
 const isAdmin=user=>Boolean(user?.emailVerified===true&&(isOwner(user)||db.prepare('SELECT email FROM admin_members WHERE email=?').get(String(user.email||'').trim().toLowerCase())));
 function signed(user){if(!user?.id)throw Object.assign(Error('Vui lòng đăng nhập.'),{status:401});}
 function admin(user){signed(user);if(!isAdmin(user))throw Object.assign(Error('Chỉ admin mới được truy cập.'),{status:403});}
 function owner(user){signed(user);if(!isOwner(user))throw Object.assign(Error('Chỉ chủ sở hữu mới được quản lý thành viên admin.'),{status:403});}
 function emailValue(value){if(typeof value!=='string')throw Error('Địa chỉ email không hợp lệ.');const email=value.trim().toLowerCase();if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Địa chỉ email không hợp lệ.');return email;}
 function record(row){return {id:row.id,ownerId:row.owner,createdAt:row.created_at,status:row.status,debts:JSON.parse(row.debts),privacy:JSON.parse(row.privacy),identity:JSON.parse(row.identity),reviewedAt:row.reviewed_at,reason:row.reason};}
 return {
 isAdmin,isOwner,
 reviewData(user){admin(user);return db.prepare('SELECT * FROM debt_submissions ORDER BY created_at DESC').all().map(record);},
 adminMembers(user){owner(user);return [...allowed].map(email=>({email,role:'owner'})).concat(db.prepare('SELECT email,granted_at AS grantedAt FROM admin_members ORDER BY granted_at DESC,email').all().filter(row=>!allowed.has(row.email)).map(row=>({...row,role:'admin'})));},
 addAdmin(user,value){owner(user);const email=emailValue(value);if(allowed.has(email)||db.prepare('SELECT email FROM admin_members WHERE email=?').get(email))throw Object.assign(Error('Email này đã có quyền admin.'),{status:409});db.prepare('INSERT INTO admin_members VALUES (?,?,?)').run(email,user.id,now());return this.adminMembers(user);},
 removeAdmin(user,value){owner(user);const email=emailValue(value);if(allowed.has(email))throw Object.assign(Error('Không thể thu hồi quyền chủ sở hữu trên trang này.'),{status:403});db.prepare('DELETE FROM admin_members WHERE email=?').run(email);return this.adminMembers(user);},
 submit(user,input){
  signed(user);if(!user.emailVerified)throw Object.assign(Error('Vui lòng xác minh email trước khi gửi thẻ.'),{status:403});
  if(!input||typeof input.submissionId!=='string'||!/^[\w-]{16,64}$/.test(input.submissionId))throw Error('Mã gửi thẻ không hợp lệ.');
  const existing=db.prepare('SELECT * FROM debt_submissions WHERE owner=? AND request_id=?').get(user.id,input.submissionId);
  const debts=validateDetails(input.debts),privacy=defaultPrivacy();
  if(!input.privacy||Array.isArray(input.privacy)||typeof input.privacy!=='object')throw Error('Lựa chọn riêng tư không hợp lệ.');
  for(const key of Object.keys(privacy)){if(input.privacy[key]!==undefined&&typeof input.privacy[key]!=='boolean')throw Error('Lựa chọn riêng tư không hợp lệ.');privacy[key]=input.privacy[key]===true;}
  if(existing){if(existing.debts!==JSON.stringify(debts)||existing.privacy!==JSON.stringify(privacy))throw Object.assign(Error('Thẻ này đã gửi. Hãy tạo thẻ mới để gửi nội dung khác.'),{status:409});return record(existing);}
  if(db.prepare("SELECT count(*) AS n FROM debt_submissions WHERE owner=? AND status='pending'").get(user.id).n>=10)throw Error('Bạn đang có 10 thẻ chờ duyệt. Vui lòng chờ admin xử lý.');
  const identity={name:user.name,nickname:user.nickname||'Broke_'+user.id.slice(0,6),age:user.age,location:user.location||user.address,photo:user.photo,email:user.email};
  const id=randomUUID();db.prepare('INSERT INTO debt_submissions (id,owner,request_id,created_at,debts,privacy,identity) VALUES (?,?,?,?,?,?,?)').run(id,user.id,input.submissionId,now(),JSON.stringify(debts),JSON.stringify(privacy),JSON.stringify(identity));
  return record(db.prepare('SELECT * FROM debt_submissions WHERE id=?').get(id));
 },
 mine(user){signed(user);return db.prepare('SELECT * FROM debt_submissions WHERE owner=? ORDER BY created_at DESC').all(user.id).map(record);},
 list(user,status='pending'){admin(user);if(!['pending','approved','rejected'].includes(status))throw Error('Trạng thái không hợp lệ.');return db.prepare('SELECT * FROM debt_submissions WHERE status=? ORDER BY created_at DESC').all(status).map(record);},
 review(user,id,input){
  admin(user);if(!['approved','rejected'].includes(input?.decision))throw Error('Quyết định không hợp lệ.');
  const reason=String(input.reason||'').trim();if(reason.length>1000||(input.decision==='rejected'&&!reason))throw Error('Vui lòng nhập lý do từ chối (tối đa 1.000 ký tự).');
  const result=db.prepare("UPDATE debt_submissions SET status=?,reviewed_at=?,reviewer=?,reason=? WHERE id=? AND status='pending'").run(input.decision,now(),user.id,reason,id);
  if(!result.changes)throw Object.assign(Error('Thẻ không tồn tại hoặc đã được xử lý. Hãy tải lại danh sách.'),{status:409});
  return record(db.prepare('SELECT * FROM debt_submissions WHERE id=?').get(id));
 },
 publicCards(excludedOwnerIds=[]){const excluded=new Set(excludedOwnerIds);return db.prepare("SELECT * FROM debt_submissions WHERE status='approved' ORDER BY created_at DESC").all().filter(row=>!excluded.has(row.owner)).map(row=>({id:row.id,createdAt:row.created_at,card:publicCard(JSON.parse(row.debts),JSON.parse(row.privacy),JSON.parse(row.identity))}));},
 close(){db.close();}
 };
}
