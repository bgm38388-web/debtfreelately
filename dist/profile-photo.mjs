export const profilePhotoPresets = [
 {id:'sprout',label:['Sprout','Mầm cây','새싹']},
 {id:'star',label:['Star','Ngôi sao','별']},
 {id:'heart',label:['Heart','Trái tim','하트']},
 {id:'sun',label:['Sun','Mặt trời','태양']},
].map(preset=>({...preset,src:`/assets/avatar-${preset.id}.svg`}));

export const profilePhotoTypes = ['image/png','image/jpeg','image/webp'];
export const maxProfilePhotoBytes = 500 * 1024;

export function isProfilePhoto(value) {
 if(typeof value!=='string')return false;
 if(!value||profilePhotoPresets.some(preset=>preset.src===value))return true;
 if(value.length>4*Math.ceil(maxProfilePhotoBytes/3)+23)return false;
 const match=/^data:image\/(?:png|jpeg|webp);base64,([a-zA-Z0-9+/]+={0,2})$/.exec(value);
 if(!match||match[1].length%4!==0)return false;
 const encoded=match[1];
 const padding=encoded.endsWith('==')?2:encoded.endsWith('=')?1:0;
 return encoded.length/4*3-padding<=maxProfilePhotoBytes;
}
