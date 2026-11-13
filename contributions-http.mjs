export function createContributionRoutes({contributions,paypal,auth,moderation,origin,token,json,body}){
 return async function route(req,res,pathname){
  const member=pathname.startsWith('/api/contributions/');
  const admin=pathname.startsWith('/api/admin/sandbox/');
  if(!member&&!admin)return false;
  const reply=(status,value)=>{json(res,status,value);return true;};
  if(pathname==='/api/contributions/config'&&req.method==='GET')
   return reply(200,{enabled:Boolean(contributions)});
  if(!contributions)return reply(503,{error:'PayPal Sandbox is not configured.'});
  if(pathname==='/api/contributions/webhook'){
   if(req.method!=='POST')return reply(405,{error:'Method not allowed.'});
   if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))
    return reply(415,{error:'Expected JSON.'});
   const chunks=[];
   let size=0;
   for await(const chunk of req){
    size+=chunk.length;
    if(size>128*1024)return reply(413,{error:'Webhook too large.'});
    chunks.push(chunk);
   }
   const raw=Buffer.concat(chunks).toString('utf8');
   const event=JSON.parse(raw);
   if(!await paypal.verify(req.headers,raw))return reply(401,{error:'Invalid webhook signature.'});
   await contributions.webhook(event);
   return reply(200,{ok:true});
  }
  if(!['GET','POST'].includes(req.method))return reply(405,{error:'Method not allowed.'});
  if(req.method==='POST'&&(req.headers.origin!==origin||!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||'')))
   return reply(403,{error:'Invalid request origin or content type.'});
  const user=await auth.session(token(req));
  if(!user)return reply(401,{error:'Sign in to continue.'});
  if(admin&&!await moderation.isAdmin(user))return reply(403,{error:'Administrator access required.'});
  if(req.method==='POST'){
   const ip=req.socket.remoteAddress;
   if(!await auth.allowRequest('sandbox:'+user.id+':'+ip))return reply(429,{error:'Too many requests.'});
   const input=await body(req);
   switch(pathname){
    case '/api/contributions/order':return reply(200,await contributions.create(user,input));
    case '/api/contributions/capture':return reply(200,await contributions.capture(user,input?.orderId));
    case '/api/admin/sandbox/creditor':await contributions.verifyCreditor(user.id,input);return reply(200,{ok:true});
    case '/api/admin/sandbox/payout':return reply(200,await contributions.payout(user.id,input?.id,input));
   }
  }
  if(req.method==='GET'){
   const params=new URL(req.url,origin).searchParams;
   switch(pathname){
    case '/api/contributions/eligible-debts':return reply(200,{indexes:await contributions.eligibleDebts(user,params.get('cardId'))});
    case '/api/contributions/options':{
     const index=params.get('debtIndex');
     const result=await contributions.eligibility(user,{cardId:params.get('cardId'),debtIndex:index===null?NaN:Number(index)});
     return reply(200,{...result,clientId:paypal.clientId});
    }
    case '/api/contributions/history':return reply(200,{contributions:await contributions.history(user)});
    case '/api/admin/sandbox/payouts':
     return reply(200,{contributions:await contributions.adminList(),audit:await contributions.audit(),
      cases:(await moderation.list(user,'approved')).map(item=>({id:item.id,debts:item.debts.map(debt=>({title:debt.title}))}))});
   }
  }
  return reply(404,{error:'Sandbox endpoint not found.'});
 };
}
