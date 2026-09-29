const status=document.querySelector('#status'),button=document.querySelector('#export');
function syncFormAttributes(doc){
 for(const input of doc.querySelectorAll('input')){input.setAttribute('value',input.value);input.toggleAttribute('checked',input.checked);}
 for(const select of doc.querySelectorAll('select')){const selected=select.selectedIndex;[...select.options].forEach((option,i)=>option.toggleAttribute('selected',i===selected));}
 for(const area of doc.querySelectorAll('textarea'))area.textContent=area.value;
}
async function rasterize(doc,width,height){
 syncFormAttributes(doc);
 // Rasterize iframe UI independently at 4x; embed that lossless source at its
 // original CSS size. Never rely on foreignObject to paint an iframe itself.
 for(const frame of [...doc.querySelectorAll('iframe')]){
  const rect=frame.getBoundingClientRect(),css=getComputedStyle(frame);
  const child=await rasterize(frame.contentDocument,rect.width,rect.height);
  const image=doc.createElement('img');for(const prop of css)image.style.setProperty(prop,css.getPropertyValue(prop));
  image.src=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(child);});
  image.width=rect.width;image.height=rect.height;await image.decode();frame.replaceWith(image);
 }
 const errors=[];
 const blob=await domtoimage.toBlob(doc.documentElement,{width,height,pixelRatio:4,scale:1,bgcolor:getComputedStyle(doc.documentElement).backgroundColor,copyDefaultStyles:false,onImageError:e=>errors.push(e),filter:node=>!['SCRIPT','NOSCRIPT'].includes(node.nodeName)});
 if(errors.length)throw Error(JSON.stringify(errors));return blob;
}
const tick=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
async function ready(frame){
 const doc=frame.contentDocument;
 await doc.fonts.ready;
 // Wait for the real UI modules to finish receiving their synthetic worker data.
 const start=Date.now();
 while(doc.documentElement.hasAttribute('data-theme-pending')||doc.querySelector('fieldset:disabled')||(doc.querySelector('#previous')?.textContent==='Your previous tab')||doc.querySelector('#parkedCount')?.textContent==='—'){
  if(Date.now()-start>15000)throw Error('Fixture did not become ready');await new Promise(r=>setTimeout(r,50));
 }
 for(const nested of doc.querySelectorAll('iframe')){if(nested.contentDocument.readyState!=='complete')await new Promise(r=>nested.addEventListener('load',r,{once:true}));await ready(nested);}
 for(const img of doc.images)await img.decode();
 await tick();
}
button.addEventListener('click',async()=>{
 button.disabled=true;status.textContent='Rendering…';
 try{
  const jobs=await(await fetch('/jobs.json')).json();
  for(const job of jobs){
   const frame=document.createElement('iframe');frame.title=job.name;frame.width=job.width;frame.height=job.height;
   const loaded=new Promise(r=>frame.addEventListener('load',r,{once:true}));frame.src=job.page;document.querySelector('#stage').replaceChildren(frame);await loaded;await ready(frame);
   const doc=frame.contentDocument;doc.activeElement?.blur();
   const blob=await rasterize(doc,job.width,job.height);
   const response=await fetch(`/export?name=${job.name}`,{method:'POST',headers:{'Content-Type':'image/png'},body:blob});
   const result=await response.text();if(!response.ok)throw Error(result);status.textContent+='\n'+result;
  }
  status.textContent+='\nComplete: five lossless exports.';
 }catch(error){status.textContent+='\nERROR: '+error.stack;console.error(error);}
 finally{button.disabled=false;}
});
