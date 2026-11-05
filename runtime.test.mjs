import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveOrigin} from './runtime.mjs';
test('Vercel API accepts only configured production and exact deployment hosts',()=>{
 const env={APP_ORIGIN:'https://app.example.com',VERCEL_URL:'specific-deploy.vercel.app',VERCEL_PROJECT_PRODUCTION_URL:'app.vercel.app'};
 assert.equal(resolveOrigin({headers:{host:'app.example.com'}},env),'https://app.example.com');
 assert.equal(resolveOrigin({headers:{host:'specific-deploy.vercel.app'}},env),'https://specific-deploy.vercel.app');
 assert.throws(()=>resolveOrigin({headers:{host:'attacker.vercel.app'}},env));
 assert.throws(()=>resolveOrigin({headers:{host:'evil.example','x-forwarded-host':'app.example.com'}},env));
});
