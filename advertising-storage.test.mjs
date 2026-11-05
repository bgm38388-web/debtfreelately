import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {optimizeCreative,createAdStorage} from './advertising-storage.mjs';

test('banner upload decodes actual images, strips metadata and creates responsive WebP variants',async()=>{
 const source=await sharp({create:{width:1400,height:500,channels:3,background:'#40562f'}}).png().toBuffer();
 const result=await optimizeCreative(source,{mime:'image/png',filename:'banner.png',alt:'Nhà tài trợ'});
 assert.equal(result.alt,'Nhà tài trợ');assert.ok(result.variants.length>=2);
 for(const variant of result.variants){const meta=await sharp(variant.buffer).metadata();assert.equal(meta.format,'webp');assert.ok(meta.width<=1400);assert.equal(meta.exif,undefined);}
 await assert.rejects(optimizeCreative(source,{mime:'image/jpeg',filename:'spoof.jpg'}));
 await assert.rejects(optimizeCreative(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),{mime:'image/png',filename:'fake.png'}));
 await assert.rejects(optimizeCreative(Buffer.alloc(2*1024*1024+1),{mime:'image/png',filename:'huge.png'}));
});
test('private local storage returns normalized images without exposing arbitrary filesystem paths',async t=>{
 const directory=await mkdtemp(path.join(tmpdir(),'dfl-banner-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 const storage=createAdStorage({directory}),source=await sharp({create:{width:800,height:300,channels:3,background:'white'}}).png().toBuffer();
 const creative=await storage.upload(source,{mime:'image/png',filename:'../unsafe.png',alt:'Banner'});
 assert.ok(!creative.variants.some(variant=>variant.pathname.includes('..')));
 const file=await storage.read(creative,640);assert.equal(file.contentType,'image/webp');assert.ok(file.buffer.length);
 await assert.rejects(storage.read({variants:[{pathname:'../../secret',width:640}]},640));
 await storage.remove(creative);
 await assert.rejects(storage.read(creative,640));
});
