import {getRuntime,resolveOrigin} from '../runtime.mjs';
import {createRequestHandler} from '../server.mjs';

export default async function handler(req,res){
 try{
  const origin=resolveOrigin(req);
  const services=await getRuntime();
  return createRequestHandler({...services,origin})(req,res);
 }catch(error){
  console.error('API initialization failed:',error.name);
  res.writeHead(error.status||503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify({error:error.status===403?'Yêu cầu không hợp lệ.':'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại.'}));
 }
}
