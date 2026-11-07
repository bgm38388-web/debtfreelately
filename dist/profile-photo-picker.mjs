import {t} from './i18n.mjs';
import {isProfilePhoto,maxProfilePhotoBytes,profilePhotoPresets,profilePhotoTypes} from './profile-photo.mjs';

export function profilePhotoPicker() {
 return `<fieldset class="profile-photo-picker">
  <legend>${t('Profile picture','Ảnh đại diện','프로필 사진')}</legend>
  <div class="profile-photo-controls">
   <div class="profile-photo-preview"></div>
   <div>
    <label>${t('Upload an image','Tải ảnh lên','이미지 업로드')}
     <input type="file" accept="${profilePhotoTypes.join(',')}">
    </label>
    <small>${t('PNG, JPG or WebP · Up to 500 KB','PNG, JPG hoặc WebP · Tối đa 500 KB','PNG, JPG 또는 WebP · 최대 500KB')}</small>
   </div>
  </div>
  <div class="profile-photo-presets" role="group" aria-label="${t('Choose an icon','Chọn biểu tượng','아이콘 선택')}">
   ${profilePhotoPresets.map(({src,label})=>`<button type="button" data-photo="${src}" aria-pressed="false" title="${t(...label)}"><img src="${src}" alt="${t(...label)}"></button>`).join('')}
   <button type="button" data-photo="" aria-pressed="false">${t('Default','Mặc định','기본')}</button>
  </div>
  <small class="form-error" role="alert"></small>
 </fieldset>`;
}

export function bindProfilePhoto(form,initialPhoto='',fallback='♡') {
 const picker=form.querySelector('.profile-photo-picker');
 const fileInput=picker.querySelector('input');
 const preview=picker.querySelector('.profile-photo-preview');
 const error=picker.querySelector('.form-error');
 const options=picker.querySelectorAll('[data-photo]');
 let photo=isProfilePhoto(initialPhoto)?initialPhoto:'';
 let pending;
 let selection=0;

 function render() {
  preview.textContent=fallback;
  if(photo){
   const image=document.createElement('img');
   image.src=photo;
   image.alt=t('Selected profile picture','Ảnh đại diện đã chọn','선택한 프로필 사진');
   preview.replaceChildren(image);
  }
  for(const button of options)button.setAttribute('aria-pressed',String(button.dataset.photo===photo));
 }

 for(const button of options)button.onclick=()=>{
  selection++;
  photo=button.dataset.photo;
  fileInput.value='';
  error.textContent='';
  render();
 };

 fileInput.onchange=()=>{
  const file=fileInput.files[0];
  if(!file)return;
  const current=++selection;
  if(!profilePhotoTypes.includes(file.type)||file.size===0||file.size>maxProfilePhotoBytes){
   error.textContent=t('Choose a PNG, JPG or WebP image up to 500 KB.','Chọn ảnh PNG, JPG hoặc WebP không quá 500 KB.','500KB 이하의 PNG, JPG 또는 WebP 이미지를 선택하세요.');
   fileInput.value='';
   return;
  }
  error.textContent='';
  pending=new Promise(resolve=>{
   const reader=new FileReader();
   const failed=()=>{
    if(current===selection){
     error.textContent=t('Could not read the image.','Không đọc được ảnh.','이미지를 읽을 수 없습니다.');
     fileInput.value='';
    }
    resolve();
   };
   reader.onerror=failed;
   reader.onload=()=>{
    if(current===selection){
     if(!isProfilePhoto(reader.result)){failed();return;}
     photo=reader.result;
     render();
    }
    resolve();
   };
   reader.readAsDataURL(file);
  });
 };
 render();
 return async ()=>{
  let reading;
  do {reading=pending;await reading;} while(reading!==pending);
  return photo;
 };
}
