import {isProfilePhoto,maxProfilePhotoBytes,profilePhotoPresets,profilePhotoTypes} from './profile-photo.mjs';

export function profilePhotoPicker() {
 return `<fieldset class="profile-photo-picker">
  <legend>${'Ảnh đại diện'}</legend>
  <div class="profile-photo-controls">
   <div class="profile-photo-preview"></div>
   <div>
    <label>${'Tải ảnh lên'}
     <input type="file" accept="${profilePhotoTypes.join(',')}">
    </label>
    <small>${'PNG, JPG hoặc WebP · Tối đa 500 KB'}</small>
   </div>
  </div>
  <div class="profile-photo-presets" role="group" aria-label="${'Chọn biểu tượng'}">
   ${profilePhotoPresets.map(({src,label})=>`<button type="button" data-photo="${src}" aria-pressed="false" title="${label}"><img src="${src}" alt="${label}"></button>`).join('')}
   <button type="button" data-photo="" aria-pressed="false">${'Mặc định'}</button>
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
   image.alt='Ảnh đại diện đã chọn';
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
   error.textContent='Chọn ảnh PNG, JPG hoặc WebP không quá 500 KB.';
   fileInput.value='';
   return;
  }
  error.textContent='';
  pending=new Promise(resolve=>{
   const reader=new FileReader();
   const failed=()=>{
    if(current===selection){
     error.textContent='Không đọc được ảnh.';
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
