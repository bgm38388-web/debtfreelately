import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'dist');
http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const data=await readFile(file);res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','css':'text/css','mjs':'text/javascript','svg':'image/svg+xml'})[file.split('.').pop()]||'application/octet-stream');res.end(data);}catch{res.writeHead(404).end('Not found');}}).listen(4173,'127.0.0.1',()=>console.log('http://127.0.0.1:4173'));
