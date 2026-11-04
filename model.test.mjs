import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePost,commitment,filterPosts} from './dist/model.mjs';
test('rejects invalid debt amounts and empty stories',()=>{assert.throws(()=>validatePost({name:'A',title:'B',story:'',amount:-1}));assert.throws(()=>validatePost({name:'A',title:'B',story:'story',amount:Infinity}));});
test('commitments cannot exceed remaining debt or be zero',()=>{assert.throws(()=>commitment({amount:100,pledged:80},21));assert.throws(()=>commitment({amount:100,pledged:0},0));assert.equal(commitment({amount:100,pledged:80},20).pledged,100);});
test('discovery respects category, search and skipped profiles',()=>{const posts=[{id:'1',category:'Y tế',title:'Viện phí',name:'An',story:'test'},{id:'2',category:'Học tập',title:'Học phí',name:'Lan',story:'test'}];assert.equal(filterPosts(posts,{category:'Y tế',query:'viện',skipped:[]}).length,1);assert.equal(filterPosts(posts,{category:'Tất cả',query:'',skipped:['1','2']}).length,0);});
