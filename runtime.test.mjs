import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveOrigin,runtimeDatabase} from './runtime.mjs';
test('Vercel API accepts only configured production and exact deployment hosts',()=>{
 const env={APP_ORIGIN:'https://app.example.com',VERCEL_URL:'specific-deploy.vercel.app',VERCEL_PROJECT_PRODUCTION_URL:'app.vercel.app'};
 assert.equal(resolveOrigin({headers:{host:'app.example.com'}},env),'https://app.example.com');
 assert.equal(resolveOrigin({headers:{host:'specific-deploy.vercel.app'}},env),'https://specific-deploy.vercel.app');
 assert.throws(()=>resolveOrigin({headers:{host:'attacker.vercel.app'}},env));
 assert.throws(()=>resolveOrigin({headers:{host:'evil.example','x-forwarded-host':'app.example.com'}},env));
});

test('Vercel Preview rejects inherited credentials and only accepts a separate database and token',()=>{
 const inherited={VERCEL:'1',VERCEL_ENV:'preview',TURSO_DATABASE_URL:'libsql://production.example',TURSO_AUTH_TOKEN:'production-test-token'};
 assert.throws(()=>runtimeDatabase(inherited),/Separate Turso credentials/);
 const separate={...inherited,PREVIEW_TURSO_DATABASE_URL:'libsql://preview.example',PREVIEW_TURSO_AUTH_TOKEN:'preview-test-token'};
 assert.throws(()=>runtimeDatabase({...separate,PREVIEW_TURSO_DATABASE_URL:'https://production.example'}),/separate database host/);
 assert.throws(()=>runtimeDatabase({...separate,PREVIEW_TURSO_AUTH_TOKEN:inherited.TURSO_AUTH_TOKEN}),/database-scoped token/);
 assert.deepEqual(runtimeDatabase(separate),{url:'libsql://preview.example',authToken:'preview-test-token'});
 assert.deepEqual(runtimeDatabase({...separate,VERCEL_ENV:'production'}),{url:'libsql://production.example',authToken:'production-test-token'});
});
