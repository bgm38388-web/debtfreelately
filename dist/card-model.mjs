import {validDebtAmount} from './debt-currency.mjs';

export const defaultPrivacy=()=>({realName:false,age:false,location:false,photo:false,publicStory:false});

export function projectPostCard(post){
 if(post.serverCard)return post.serverCard;
 const privacy=post.privacy||(post.sample
  ?{realName:true,age:true,location:true,photo:true,publicStory:true}
  :defaultPrivacy());
 const samplePortrait=post.sample&&post.id==='demo-1';
 const debt={title:post.title,story:post.story,...(post.sample?{amount:post.amount}:{})};
 return publicCard([debt],privacy,{
  name:post.name,
  nickname:post.nickname||'Broke_'+post.id.slice(0,6),
  age:post.age||(samplePortrait?25:undefined),
  location:post.city,
  photo:post.photo||(samplePortrait?'assets/demo-minh-anh.png':undefined),
 });
}
export function validateDetails(debts){if(!Array.isArray(debts)||!debts.length||debts.length>20)throw Error('Vui lòng thêm từ 1 đến 20 khoản nợ.');for(let i=0;i<debts.length;i++){const d=debts[i];if(!d||typeof d.title!=='string'||!d.title.trim()||d.title.trim().length>100)throw Error(`Khoản nợ ${i+1}: nhập tiêu đề từ 1–100 ký tự.`);if(typeof d.story!=='string'||!d.story.trim()||d.story.trim().length>3000)throw Error(`Khoản nợ ${i+1}: nhập câu chuyện từ 1–3.000 ký tự.`);if(!validDebtAmount(d.amount,d.currency))throw Error(`Khoản nợ ${i+1}: nhập số tiền hợp lệ cho đơn vị tiền tệ đã chọn.`);}return debts.map(d=>({title:d.title.trim(),story:d.story.trim(),amount:d.amount,...(d.currency&&d.currency!=='VND'?{currency:d.currency}:{})}));}
export function publicCard(debts,privacy,identity={}){return {name:privacy.realName&&identity.name?identity.name:identity.nickname||'Broke ẩn danh',...(privacy.age&&identity.age?{age:identity.age}:{}),...(privacy.location&&identity.location?{location:identity.location}:{}),...(privacy.photo&&identity.photo?{photo:identity.photo}:{}),debts:debts.map(d=>({title:d.title,...(validDebtAmount(d.amount,d.currency)?{amount:d.amount,...(d.currency&&d.currency!=='VND'?{currency:d.currency}:{})}:{}),...(privacy.publicStory?{story:d.story}:{})}))};}

