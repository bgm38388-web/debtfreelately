import {test} from 'node:test';
import assert from 'node:assert/strict';
import {debtCardHTML,cardDetailsHTML} from './dist/debt-card.mjs';
import {discoveryCard} from './dist/discover-design.mjs';
import {projectPostCard} from './dist/card-model.mjs';

test('debt cards show the visible name and original amounts on the image',()=>{
 const card={name:'Mina <Broke>',photo:'/assets/avatar-heart.svg',debts:[{title:'Rent',amount:100,currency:'AUD'},{title:'Bills',amount:50,currency:'USD'}]};
 for(const html of [debtCardHTML(card),discoveryCard(card,{post:{category:'Khác'}})]){
  assert.match(html,/<img[^>]+avatar-heart\.svg[\s\S]*?class="debt-image-caption"[\s\S]*?Mina &lt;Broke&gt;[\s\S]*?AUD[\s\S]*?USD/);
  assert.match(html,/<debt-rate-estimate data-debts=/);
 }
 assert.match(cardDetailsHTML(card),/<debt-rate-estimate data-debts=/);
});

test('the sample feed projects Quốc Bảo’s original amount into both displays',()=>{
 const post={id:'demo-4',name:'Quốc Bảo',city:'Cần Thơ',title:'Dựng lại góc sửa xe nhỏ của mình.',category:'Sinh hoạt',story:'Sample story',amount:9500000,sample:true};
 const card=projectPostCard(post);
 assert.equal(card.debts[0].amount,9500000);
 for(const html of [debtCardHTML(card),discoveryCard(card,{post})]){
  assert.match(html,/class="debt-image-caption"><h2>Quốc Bảo<\/h2><strong>VND\s+9,500,000/);
  assert.match(html,/<debt-rate-estimate data-debts=/);
 }
});
