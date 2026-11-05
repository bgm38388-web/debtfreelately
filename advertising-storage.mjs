import sharp from 'sharp';
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {put,get,del} from '@vercel/blob';

const mimeFormats={'image/jpeg':'jpeg','image/png':'png','image/webp':'webp'};
const fail=message=>Object.assign(Error(message),{status:400});
export async function optimizeCreative(buffer,{mime,filename='',alt=''}={}){
 if(!Buffer.isBuffer(buffer)||!buffer.length||buffer.length>2*1024*1024)throw fail('Banner phải có dung lượng từ 1 byte đến 2 MB.');
 if(!mimeFormats[mime])throw fail('Chỉ chấp nhận JPG, PNG hoặc WebP.');
 if(String(filename).length>200||String(alt).length>200)throw fail('Tên ảnh và mô tả tối đa 200 ký tự.');
 try{
  const image=sharp(buffer,{limitInputPixels:16000000,animated:false,failOn:'warning'}),meta=await image.metadata();
  if(meta.format!==mimeFormats[mime]||!meta.width||!meta.height||(meta.pages||1)>1||meta.width<80||meta.height<40||meta.width>8000||meta.height>8000)throw fail('Ảnh không hợp lệ hoặc kích thước không phù hợp.');
  const variants=[];
  for(const width of [...new Set([320,640,1280,1920].filter(width=>width<meta.width).concat(Math.min(meta.width,1920)))]){
   const {data,info}=await sharp(buffer,{limitInputPixels:16000000}).rotate().resize({width,withoutEnlargement:true}).webp({quality:82}).toBuffer({resolveWithObject:true});
   variants.push({width:info.width,height:info.height,bytes:data.length,mime:'image/webp',buffer:data});
  }
  return {id:randomUUID(),filename:path.basename(String(filename)).replace(/[\x00-\x1f]/g,''),alt:String(alt).trim(),hash:createHash('sha256').update(buffer).digest('hex'),variants};
 }catch(error){if(error.status)throw error;throw fail('Không thể đọc ảnh. Hãy tải JPG, PNG hoặc WebP hợp lệ.');}
}

export function createAdStorage({directory=path.resolve(import.meta.dirname,'.runtime/ad-media'),remote=Boolean(process.env.VERCEL||process.env.BLOB_READ_WRITE_TOKEN||process.env.BLOB_STORE_ID)}={}){
 const validate=pathname=>{if(typeof pathname!=='string'||!/^ads\/[\da-f-]{36}\/(original\.(png|jpeg|webp)|\d{2,4}\.webp)$/.test(pathname))throw fail('Đường dẫn ảnh không hợp lệ.');return pathname;};
 const local=pathname=>{validate(pathname);const file=path.resolve(directory,pathname);if(!file.startsWith(path.resolve(directory)+path.sep))throw fail('Đường dẫn ảnh không hợp lệ.');return file;};
 async function store(pathname,buffer,contentType){if(remote){await put(pathname,buffer,{access:'private',addRandomSuffix:false,contentType,cacheControlMaxAge:60});}else{const file=local(pathname);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,buffer);}return pathname;}
 async function remove(creative){const paths=[creative.originalPathname,...(creative.variants||[]).map(variant=>variant.pathname)].filter(Boolean);for(const pathname of paths){validate(pathname);if(remote)await del(pathname);else await unlink(local(pathname)).catch(error=>{if(error.code!=='ENOENT')throw error;});}}
 return {
  async upload(buffer,options){const creative=await optimizeCreative(buffer,options),stored=[];
   try{
    creative.originalPathname=await store('ads/'+creative.id+'/original.'+mimeFormats[options.mime],buffer,options.mime);stored.push(creative.originalPathname);
    const variants=[];
    for(const variant of creative.variants){const pathname=await store('ads/'+creative.id+'/'+variant.width+'.webp',variant.buffer,variant.mime);stored.push(pathname);const {buffer:_,...metadata}=variant;variants.push({...metadata,pathname});}
    return {...creative,variants};
   }catch(error){for(const pathname of stored){try{if(remote)await del(pathname);else await unlink(local(pathname));}catch{}}throw error;}
  },
  async read(creative,width=640){const variants=[...(creative.variants||[])].sort((a,b)=>a.width-b.width),variant=variants.find(item=>item.width>=width)||variants.at(-1);if(!variant)throw fail('Không tìm thấy ảnh.');validate(variant.pathname);
   if(!remote)return {buffer:await readFile(local(variant.pathname)),contentType:'image/webp'};
   const result=await get(variant.pathname,{access:'private'});if(!result||result.statusCode!==200)throw Object.assign(Error('Không tìm thấy ảnh.'),{status:404});return {buffer:Buffer.from(await new Response(result.stream).arrayBuffer()),contentType:'image/webp'};
  },remove
 };
}
