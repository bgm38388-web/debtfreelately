import path from 'node:path';
import {mkdir} from 'node:fs/promises';
import {createAuth,sendVerification} from './auth.mjs';
import {createModeration} from './moderation.mjs';
import {createAdvertising} from './advertising.mjs';
import {createSandboxPayPal} from './paypal.mjs';
import {createContributions} from './contributions.mjs';
import {createAdStorage} from './advertising-storage.mjs';

export function resolveOrigin(req,env=process.env){
 const origins=[env.APP_ORIGIN,env.CANONICAL_APP_ORIGIN,env.AD_PUBLIC_ORIGIN,...['VERCEL_URL','VERCEL_BRANCH_URL','VERCEL_PROJECT_PRODUCTION_URL'].map(key=>env[key]?'https://'+env[key]:null)].filter(Boolean).map(value=>new URL(value).origin);
 const origin=origins.find(value=>new URL(value).host===req.headers.host);
 if(!origin)throw Object.assign(Error('Request host is not configured.'),{status:403});
 return origin;
}
export async function createRuntime(env=process.env){
 const remote=env.TURSO_DATABASE_URL&&env.TURSO_AUTH_TOKEN?{url:env.TURSO_DATABASE_URL,authToken:env.TURSO_AUTH_TOKEN}:null;
 if(env.VERCEL&&!remote)throw Error('Turso is required on Vercel.');
 const folder=path.resolve(env.RUNTIME_DIRECTORY||path.resolve(import.meta.dirname ?? process.cwd(),'.runtime'));
 if(!remote)await mkdir(folder,{recursive:true});
 const auth=await createAuth({database:remote||path.join(folder,'accounts.sqlite'),send:sendVerification});
 let moderation,advertising,contributions;try{moderation=await createModeration({database:remote||path.join(folder,'cards.sqlite'),adminEmails:(env.ADMIN_EMAILS||'').split(',')});advertising=await createAdvertising({database:remote||path.join(folder,'advertising.sqlite')});const adStorage=createAdStorage({directory:path.join(folder,'ad-media'),remote:Boolean(env.VERCEL||env.BLOB_READ_WRITE_TOKEN||env.BLOB_STORE_ID)});const paypal=createSandboxPayPal(env);
 if(paypal)contributions=await createContributions({database:remote||path.join(folder,'sandbox-contributions.sqlite'),paypal,
  async debt(id,index){
   const target=await moderation.contributionDebt(id,index);
   return target&&!(await auth.blockedAccountIds()).includes(target.ownerId)?target:null;
  }
 });
 return {auth,moderation,advertising,adStorage,paypal,contributions};}catch(error){await auth.close();await moderation?.close();await advertising?.close();await contributions?.close();throw error;}
}
let runtime;
export function getRuntime(){return runtime??=(createRuntime().catch(error=>{runtime=undefined;throw error;}));}
