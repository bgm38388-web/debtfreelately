const base='https://api-m.sandbox.paypal.com';

export function createSandboxPayPal(env=process.env,fetcher=fetch){
 const {PAYPAL_ENV:mode,PAYPAL_CLIENT_ID:clientId,PAYPAL_CLIENT_SECRET:secret,PAYPAL_WEBHOOK_ID:webhookId}=env;
 if(mode!=='sandbox'||!clientId||!secret||!webhookId)return null;
 let token,expires=0;
 async function request(path,options){
  try{
   const response=await fetcher(base+path,{...options,redirect:'error',signal:AbortSignal.timeout(10000)});
   return {ok:response.ok,data:await response.json()};
  }catch{throw Object.assign(Error('PayPal Sandbox is temporarily unavailable.'),{status:502});}
 }
 async function accessToken(){
  if(token&&Date.now()<expires)return token;
  const {ok,data}=await request('/v1/oauth2/token',{method:'POST',headers:{
   Authorization:'Basic '+Buffer.from(clientId+':'+secret).toString('base64'),
   'Content-Type':'application/x-www-form-urlencoded'
  },body:'grant_type=client_credentials'});
  if(!ok||!data.access_token)throw Object.assign(Error('PayPal Sandbox authentication failed.'),{status:502});
  token=data.access_token;
  expires=Date.now()+Math.max(0,Number(data.expires_in)-60)*1000;
  return token;
 }
 async function call(path,{body,id,raw=false}={}){
  const result=await request(path,{method:body===undefined?'GET':'POST',headers:{
   Authorization:'Bearer '+await accessToken(),'Content-Type':'application/json',Prefer:'return=representation',
   ...(id?{'PayPal-Request-Id':id}:{})
  },body:raw?body:body===undefined?undefined:JSON.stringify(body)});
  if(!result.ok)throw Object.assign(Error('PayPal Sandbox could not complete this request. Check your history before retrying.'),{status:502,providerIssue:result.data?.details?.[0]?.issue});
  return result.data;
 }
 return {
  clientId,
  create(row){
   const digits=row.currency==='JPY'?0:2;
   return call('/v2/checkout/orders',{id:row.id,body:{intent:'CAPTURE',purchase_units:[{
    custom_id:row.id,description:'DebtFreeLately Sandbox contribution',
    amount:{currency_code:row.currency,value:(row.gross_minor/10**digits).toFixed(digits)}
   }]}});
  },
  async capture(row){
   const path='/v2/checkout/orders/'+encodeURIComponent(row.order_id);
   let order;
   try{order=await call(path+'/capture',{id:row.id+'-capture',body:{}});}
   catch(error){if(error.providerIssue!=='ORDER_ALREADY_CAPTURED')throw error;order=await call(path);}
   const units=order.purchase_units;
   const captures=units?.[0]?.payments?.captures;
   if(order.id!==row.order_id||units?.length!==1||units[0].custom_id!==row.id||captures?.length!==1)
    throw Object.assign(Error('Unexpected PayPal Sandbox capture.'),{status:502});
   return captures[0];
  },
  async verify(headers,raw){
   const fields={webhook_id:webhookId};
   for(const key of ['auth_algo','cert_url','transmission_id','transmission_sig','transmission_time']){
    const value=headers['paypal-'+key.replaceAll('_','-')];
    if(typeof value!=='string'||!value||value.length>4096)return false;
    fields[key]=value;
   }
   const body=JSON.stringify(fields).slice(0,-1)+',"webhook_event":'+raw+'}';
   return (await call('/v1/notifications/verify-webhook-signature',{body,raw:true})).verification_status==='SUCCESS';
  }
 };
}
