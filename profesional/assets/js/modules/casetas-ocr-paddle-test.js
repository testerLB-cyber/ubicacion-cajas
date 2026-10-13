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
async function run(){
 const file=$('casOcrFile')?.files?.[0],button=$('casOcrRun');
 if(!file){status('Selecciona una fotografía primero.');return;}
 if(!file.type.startsWith('image/')){status('El archivo debe ser una imagen.');return;}
 if(file.size>15*1024*1024){status('Imagen demasiado grande (máximo 15 MB).');return;}
 button.disabled=true;
 try{
  status('Preparando PaddleOCR móvil… Si no termina en 45 segundos, se cancelará la espera.');
  if(!paddlePromise)paddlePromise=(async()=>{
   const urls=[
    'https://cdn.jsdelivr.net/npm/@paddleocr/paddleocr-js@0.4.2/+esm',
    'https://esm.sh/@paddleocr/paddleocr-js@0.4.2?bundle'
   ];
   let error=null;
   for(const url of urls){
    try{
     const mod=await import(url);
     const PaddleOCR=mod.PaddleOCR||mod.default?.PaddleOCR||(typeof mod.default?.create==='function'?mod.default:null);
     if(typeof PaddleOCR?.create!=='function')throw new Error('La biblioteca cargó sin exportar PaddleOCR.create');
     status('Inicializando modelos PP-OCRv5…');
     return await Promise.race([PaddleOCR.create({textDetectionModelName:'PP-OCRv5_mobile_det',textRecognitionModelName:'PP-OCRv5_mobile_rec',ortOptions:{backend:'wasm',numThreads:1}}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('La carga de modelos tardó más de 45 segundos. Prueba con Wi-Fi o desde una computadora; no se agregó información incompleta.')),45000))]);
    }catch(e){error=e;console.warn('[Casetas OCR] No se pudo inicializar desde',url,e);}
   }
   throw error||new Error('No se pudo inicializar PaddleOCR');
  })().catch(e=>{paddlePromise=null;throw e;});
  const ocr=await paddlePromise;
  status('Reconociendo texto de la fotografía…');
  const [result]=await Promise.race([ocr.predict(file),new Promise((_,reject)=>setTimeout(()=>reject(new Error('El reconocimiento tardó más de 40 segundos. Prueba una imagen más pequeña.')),40000))]);
  const items=(result?.items||[]).filter(i=>String(i.text||'').trim()).sort((a,b)=>{const ay=Math.min(...(a.poly||[[0,0]]).map(p=>p[1]||0)),by=Math.min(...(b.poly||[[0,0]]).map(p=>p[1]||0));return ay-by;});
  if(!items.length){status('No se reconoció texto. Prueba con mejor iluminación y el ticket completo.');return;}
  const summary=parse(items.map(i=>String(i.text).trim()));
  const box=$('casOcrPreview');box.textContent=summary;box.style.display='block';
  const comments=$('casComprobarComentarios');if(!comments){status('No se encontró el campo Comentarios.');return;}
  const current=comments.value.trimEnd(),next=current+(current?'\n\n':'')+summary;
  if(comments.maxLength>0&&next.length>comments.maxLength){status('Texto reconocido, pero excede el límite de Comentarios ('+comments.maxLength+' caracteres). Se muestra abajo para copiar o resumir.');return;}
  comments.value=next;comments.dispatchEvent(new Event('input',{bubbles:true}));
  status('✓ OCR completado: '+items.length+' líneas. Resultado agregado a Comentarios; revisa los datos antes de guardar.');
 }catch(e){status('No se pudo ejecutar PaddleOCR: '+(e?.message||String(e))+' — Comprueba conexión y compatibilidad del navegador.');}
 finally{button.disabled=false;}
}
function init(){$('casOcrRun')?.addEventListener('click',run);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
