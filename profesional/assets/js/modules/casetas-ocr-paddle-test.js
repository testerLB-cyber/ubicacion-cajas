// Prueba opcional PaddleOCR PP-OCRv5 en navegador. No persiste fotos.
let paddlePromise=null;
const $=id=>document.getElementById(id);
const status=t=>{$('casOcrStatus').textContent=t;};
function parse(lines){
 const text=lines.join('\n');
 const pick=(re)=>{const m=text.match(re);return m?.[1]?.trim()||'No identificado';};
 const money=[...text.matchAll(/(?:TOTAL|IMPORTE|PAGADO|PAGO|COSTO)\s*[:$ ]*\s*(\$?\s*[\d,]+\.\d{2})/gi)].map(m=>m[1]);
 const plaza=pick(/(?:PLAZA|CASETA|TRAMO)\s*[:#-]?\s*([^\n]{3,45})/i);
 const folio=pick(/(?:FOLIO|TICKET|OPERACI[ÓO]N|TRANSACCI[ÓO]N)\s*(?:N[°O.]*)?\s*[:#-]?\s*([A-Z0-9-]{4,})/i);
 const fecha=pick(/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\b/);
 const hora=pick(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
 return ['TICKET DE CASETA · LECTURA OCR','Caseta: '+plaza,'Folio: '+folio,'Fecha: '+fecha,'Hora: '+hora,'Importe detectado: '+(money.at(-1)||'No identificado'),'Revisar contra fotografía original.'].join('\n');
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
  status('✓ Ticket leído y datos organizados en Observaciones. Verifica antes de guardar.');
 }catch(e){status('No se pudo leer la fotografía: '+(e?.message||String(e)));}
 finally{button.disabled=false;try{await worker?.terminate()}catch{}}
}
function init(){$('casOcrRun')?.addEventListener('click',run);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
