// This release accepts the Google LLC CMP only (IAB CMP ID 300).
// CMP deployment and approved public-site messaging are external prerequisites.
export function validGoogleConsent(data,success){
 return success===true&&data?.cmpStatus==='loaded'&&['tcloaded','useractioncomplete'].includes(data.eventStatus)&&data.cmpId===300&&typeof data.tcString==='string'&&data.tcString.length>10&&data.purpose?.consents?.[1]===true&&data.vendor?.consents?.[755]===true;
}
