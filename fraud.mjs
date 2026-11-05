// Explainable review signals only. These rules never label a person as fraudulent
// and never block an account automatically. No document analysis without uploads.
import {createHash} from 'node:crypto';
const normalize=value=>String(value||'').normalize('NFKC').trim().toLocaleLowerCase('vi').replace(/\s+/g,' ');
export function fraudSignals({accounts,submissions,now=Date.now()}){
 const signals=[];
 function grouped(items,keyOf,type,title,explanation){const groups=new Map();for(const item of items){const key=keyOf(item);if(!key)continue;const group=groups.get(key)||[];group.push(item);groups.set(key,group);}for(const group of groups.values()){const accountIds=[...new Set(group.map(item=>item.ownerId||item.id))];if(accountIds.length<2)continue;signals.push({id:type+':'+createHash('sha256').update(accountIds.sort().join('|')).digest('hex').slice(0,16),type,title,explanation,accountIds,cardIds:group.filter(item=>item.ownerId).map(item=>item.id)});}}
 grouped(accounts,a=>{const digits=String(a.phone||'').replace(/\D/g,'');return digits.length>=8?digits:'';},'shared-phone','Trùng số điện thoại','Nhiều tài khoản dùng cùng số điện thoại. Có thể là số dùng chung; cần kiểm tra trước khi xử lý.');
 grouped(accounts,a=>a.name&&a.age?normalize(a.name)+'|'+a.age:'','matching-profile','Tên và tuổi giống nhau','Tên và tuổi trùng nhau không đủ để xác định cùng một người.');
 grouped(submissions,s=>{const text=normalize(s.debts.map(d=>d.story).join(' '));return text.length>=40?createHash('sha256').update(text).digest('hex'):'';},'duplicate-story','Câu chuyện giống nhau giữa các tài khoản','Nội dung câu chuyện sau chuẩn hóa giống nhau. Admin cần đọc và xác minh ngữ cảnh.');
 for(const account of accounts){const recent=submissions.filter(s=>s.ownerId===account.id&&Date.parse(s.createdAt)<=now&&Date.parse(s.createdAt)>now-86400000);if(recent.length>=5)signals.push({id:'burst:'+account.id,type:'submission-burst',title:'Nhiều thẻ trong 24 giờ',explanation:`Tài khoản gửi ${recent.length} thẻ trong 24 giờ gần nhất. Đây là tín hiệu cần xem xét, không phải kết luận gian lận.`,accountIds:[account.id],cardIds:recent.map(s=>s.id)});}
 return signals;
}
