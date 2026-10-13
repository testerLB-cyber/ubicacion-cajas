// Prueba OCR de importes de casetas con Tesseract.js; no persiste fotos.
let paddlePromise=null;
const $=id=>document.getElementById(id);
const status=t=>{$('casOcrStatus').textContent=t;};
function parse(lines){
 const text=lines.join('\n');
 const normalized=text.replace(/[ＯO](?=\d)/g,'0').replace(/[lI](?=\d)/g,'1');
 const candidates=[];
 const regex=/(?:\$\s*)?\d{1,5}(?:[.,]\d{3})*[.,]\d{2}\b|(?:\$\s*)?\d{1,5}\b/g;
 for(const line of normalized.split('\n')){
  const upper=line.toUpperCase();
  const priority=/\b(TOTAL|IMPORTE|PAGADO|PAGO|CUOTA|TARIFA|EFECTIVO|COSTO|MONTO)\b/.test(upper)?4:0;
  const penalty=/\b(FOLIO|TICKET|OPERACION|OPERACIÓN|TRANSACCION|TRANSACCIÓN|FECHA|HORA|RFC|IVA|CAMBIO|RECIBIDO)\b/.test(upper)?-4:0;
  for(const match of line.matchAll(regex)){
   const raw=match[0].replace(/\$/g,'').replace(/\s/g,'');
   const decimals=/[.,]\d{2}$/.test(raw);
   if(!decimals&&!priority)continue;
   const clean=raw.includes(',')&&raw.includes('.')?raw.replace(/,/g,''):raw.replace(',','.');
   const value=Number(clean);
   if(!Number.isFinite(value)||value<=0||value>10000)continue;
   candidates.push({value,score:priority+penalty+(decimals?2:0),line:line.trim()});
  }
 }
 candidates.sort((x,y)=>y.score-x.score);
 const best=candidates[0];
 return best?'IMPORTE DETECTADO (OCR · VERIFICAR): $'+best.value.toFixed(2)+'\nTexto origen: '+best.line:'IMPORTE NO IDENTIFICADO\nRevisa la foto y el texto OCR reconocido.';
}
let tesseractLoader=null;
function loadScript(src){
 return new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src=src;s.async=true;
  s.onload=resolve;s.onerror=()=>reject(new Error('No se pudo descargar el motor OCR.'));
  document.head.appendChild(s);
 });
}
async function prepareImage(file){
 const img=await createImageBitmap(file);
 const scale=Math.min(1,1600/Math.max(img.width,img.height));
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(img.width*scale));
 canvas.height=Math.max(1,Math.round(img.height*scale));
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(img,0,0,canvas.width,canvas.height);
 img.close?.();
 return canvas;
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
  const image=await prepareImage(file);
  status('Cargando motor OCR ligero…');
  if(!tesseractLoader)tesseractLoader=loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js').catch(e=>{tesseractLoader=null;throw e;});
  await tesseractLoader;
  if(!window.Tesseract?.createWorker)throw new Error('El motor OCR no se cargó correctamente.');
  status('Preparando reconocimiento de texto…');
  const task=(async()=>{
   worker=await window.Tesseract.createWorker('spa+eng',1,{logger:m=>{
    if(m.status==='recognizing text')status('Leyendo ticket… '+Math.round((m.progress||0)*100)+'%');
   }});
   const result=await worker.recognize(image);
   return result?.data?.text||'';
  })();
  const text=await Promise.race([task,new Promise((_,reject)=>setTimeout(()=>reject(new Error('El reconocimiento tardó demasiado. Prueba con una foto más clara o de menor tamaño.')),60000))]);
  const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length){status('No se reconoció texto. Prueba otra foto con buena luz.');return;}
  const summary=parse(lines);
  const preview=$('casOcrPreview');preview.textContent=summary+'\n\nTexto completo detectado:\n'+lines.join('\n');preview.style.display='block';
  const comments=$('casComprobarComentarios');if(!comments){status('No se encontró el campo Comentarios.');return;}
  const current=comments.value.trimEnd(),next=current+(current?'\n\n':'')+summary;
  if(comments.maxLength>0&&next.length>comments.maxLength){status('Se reconoció el ticket, pero Observaciones está lleno. Revisa el resultado abajo y libera espacio.');return;}
  comments.value=next;comments.dispatchEvent(new Event('input',{bubbles:true}));
  status(summary.startsWith('IMPORTE DETECTADO')?'✓ Importe posible agregado a Observaciones. Verifica antes de guardar.':'No se pudo identificar un importe. Revisa el texto OCR debajo.');
 }catch(e){status('No se pudo leer la fotografía: '+(e?.message||String(e)));}
 finally{button.disabled=false;try{await worker?.terminate()}catch{}}
}
function init(){$('casOcrRun')?.addEventListener('click',run);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
