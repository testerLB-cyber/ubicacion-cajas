// Prueba OCR de importes de casetas con Tesseract.js; no persiste fotos.
let paddlePromise=null;
const $=id=>document.getElementById(id);
const status=t=>{$('casOcrStatus').textContent=t;};
function parse(lines){
 const clean=lines.map(x=>x.trim()).filter(Boolean);
 const normalize=s=>s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
 const number=s=>{
  const m=s.match(/(?:\$\s*)?(\d{1,5}(?:[.,]\d{3})*[.,]\d{2}|\d{1,5})\b/g)||[];
  return m.map(raw=>{let x=raw.replace(/[$\s]/g,'');if(x.includes(',')&&x.includes('.'))x=x.replace(/,/g,'');else if(/,\d{2}$/.test(x))x=x.replace(',','.');return Number(x)}).filter(v=>Number.isFinite(v)&&v>0&&v<=10000);
 };
 let best=null;
 for(let i=0;i<clean.length;i++){
  const line=normalize(clean[i]);
  const total=/\bT[O0]TAL\b/.test(line);
  const amount=/\b(IMPORTE|CUOTA|TARIFA|PAGADO|MONTO)\b/.test(line);
  const exclude=/\b(IVA|SUBTOTAL|CAMBIO|RECIBIDO|FOLIO|FECHA|HORA|CARRIL|CLASE)\b/.test(line);
  const values=number(clean[i]);
  if((total||amount)&&!values.length&&i+1<clean.length)values.push(...number(clean[i+1]));
  for(const value of values){
   const score=(total?100:amount?55:0)+(exclude?-100:0)+(/\d[.,]\d{2}/.test(clean[i])?5:0);
   if(score<1)continue;
   if(!best||score>best.score)best={value,score,line:clean[i]};
  }
 }
 if(!best)return {found:false,summary:'IMPORTE NO IDENTIFICADO',detail:'No se detectó una línea TOTAL o IMPORTE confiable.'};
 return {found:true,summary:'TICKET DE CASETA\nImporte total (verificar): $'+best.value.toFixed(2),detail:'Línea reconocida: '+best.line};
}
let tesseractLoader=null;
function loadScript(src){
 return new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src=src;s.async=true;
  s.onload=resolve;s.onerror=()=>reject(new Error('No se pudo descargar el motor OCR.'));
  document.head.appendChild(s);
 });
}
async function prepareImage(file,rotation=0){
 const img=await createImageBitmap(file);
 try{
  const scale=Math.min(1,1800/Math.max(img.width,img.height));
  const w=Math.max(1,Math.round(img.width*scale));
  const h=Math.max(1,Math.round(img.height*scale));
  const canvas=document.createElement('canvas');
  const sideways=Math.abs(rotation)%180===90;
  canvas.width=sideways?h:w;
  canvas.height=sideways?w:h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.translate(canvas.width/2,canvas.height/2);
  ctx.rotate(rotation*Math.PI/180);
  ctx.drawImage(img,-w/2,-h/2,w,h);
  return canvas;
 }finally{img.close?.();}
}
async function run(){
 const file=$('casOcrFile')?.files?.[0],button=$('casOcrRun');
 if(!file){status('Selecciona una fotografía primero.');return;}
 if(!file.type.startsWith('image/')){status('El archivo debe ser una imagen.');return;}
 if(file.size>15*1024*1024){status('Imagen demasiado grande (máximo 15 MB).');return;}
 button.disabled=true;
 let worker=null;
 try{
  status('Preparando imagen…');
  status('Cargando motor OCR…');
  if(!tesseractLoader)tesseractLoader=loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js').catch(e=>{tesseractLoader=null;throw e;});
  await tesseractLoader;
  if(!window.Tesseract?.createWorker)throw new Error('El motor OCR no se cargó correctamente.');
  status('Preparando reconocimiento…');
  worker=await window.Tesseract.createWorker('spa+eng',1,{logger:m=>{if(m.status==='recognizing text')status('Leyendo ticket… '+Math.round((m.progress||0)*100)+'%');}});
  let best=null,allText='';
  for(const angle of [0,90,270]){
   status('Buscando TOTAL en foto'+(angle?' (girada '+angle+'°)':'')+'…');
   const image=await prepareImage(file,angle);
   const result=await worker.recognize(image);
   const text=result?.data?.text||'';
   allText+='\n--- Orientación '+angle+'° ---\n'+text;
   const found=parse(text.split(/\r?\n/));
   if(found.found&&(!best||found.summary.length>best.summary.length))best=found;
   if(found.found)break;
  }
  const summary=best?.summary||'IMPORTE NO IDENTIFICADO';
  const preview=$('casOcrPreview');preview.textContent=summary+'\n\n'+(best?.detail||'')+'\n\nTexto OCR:\n'+allText;preview.style.display='block';
  if(!best){status('No se identificó TOTAL en ninguna orientación. Revisa el texto detectado.');return;}
  const comments=$('casComprobarComentarios');if(!comments){status('No se encontró el campo Comentarios.');return;}
  const current=comments.value.trimEnd(),next=current+(current?'\n\n':'')+summary;
  if(comments.maxLength>0&&next.length>comments.maxLength){status('Observaciones está lleno; el resultado aparece abajo.');return;}
  comments.value=next;comments.dispatchEvent(new Event('input',{bubbles:true}));
  status('✓ Importe total agregado a Observaciones. Verifica antes de guardar.');
 }catch(e){status('No se pudo leer la fotografía: '+(e?.message||String(e)));}
 finally{button.disabled=false;try{await worker?.terminate()}catch{}}
}
function init(){$('casOcrRun')?.addEventListener('click',run);$('casOcrFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];const el=$('casOcrFileName');if(el)el.textContent=f?'✓ '+f.name+' ('+Math.round(f.size/1024)+' KB)':'Ninguna foto seleccionada';status(f?'Foto seleccionada. Presiona Leer información de la foto.':'Selecciona una foto para continuar.');});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
