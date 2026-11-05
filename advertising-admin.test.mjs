import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advertisingCheckbox,moveAdAssignments} from './dist/advertising-admin.mjs';
test('campaign checkbox labels cannot execute stored HTML or escape attributes',()=>{
 const markup=advertisingCheckbox('campaign:" onfocus="alert(1)','<img src=x onerror=alert(1)>',true);
 assert.ok(!markup.includes('<img'));
 assert.match(markup,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.ok(!markup.includes('name="campaign:" onfocus='));
 assert.match(markup,/checked/);
});
test('keyboard placement moves selected campaigns while preserving unrelated campaigns and mobile configuration',()=>{
 const zones=[{id:'home-top',device:'desktop',campaignIds:['a','b'],enabled:true},{id:'home-bottom',device:'desktop',campaignIds:[],enabled:true},{id:'home-top',device:'mobile',campaignIds:['a'],enabled:true}];
 moveAdAssignments(zones,{zoneId:'home-bottom',device:'desktop',campaignIds:['a']});
 assert.deepEqual(zones[0].campaignIds,['b']);assert.deepEqual(zones[1].campaignIds,['a']);assert.deepEqual(zones[2].campaignIds,['a']);
});
