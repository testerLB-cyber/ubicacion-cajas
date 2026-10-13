// Prueba opcional PaddleOCR PP-OCRv5 en navegador. No persiste fotos.
let paddlePromise=null;
const $=id=>document.getElementById(id);
const status=t=>{$('casOcrStatus').textContent=t;};
function parse(lines){
 const text=lines.join('\n');
 const find=(regex)=>{const m=text.match(regex);return m?.[1]?.trim()||'No identificado';};
 const moneyMatches=[...text.matchAll(/(?:TOTAL|IMPORTE|PAGADO|PAGO|COSTO)\s*[:$ ]*\s*(\$?\s*[\d,]+\.\d{2})/gi)].map(m=>m[1]);
 const amount=moneyMatches.at(-1)||'No identificado (verificar)';
 const date=find(/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\b/);
 const time=find(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/);
 const folio=find(/(?:FOLIO|TICKET|OPERACI[ÓO]N|TRANSACCI[ÓO]N)\s*(?:N[°O.]*)?\s*[:#-]?\s*([A-Z0-9-]{4,})/i);
 const plaza=find(/(?:PLAZA|CASETA|TRAMO)\s*[:#-]?\s*([^\n]{3,45})/i);
 return '--- LECTURA OCR TICKET (PRUEBA) ---\nCaseta/plaza: '+plaza+'\nFolio: '+folio+'\nFecha: '+date+'\nHora: '+time+'\nImporte posible: '+amount+'\nTexto reconocido:\n'+text+'\n--- FIN OCR ---';
}
async function run(){
 const file=$('casOcrFile')?.files?.[0],button=$('casOcrRun');
 if(!file){status('Selecciona una fotografía primero.');return;}
 if(!file.type.startsWith('image/')){status('El archivo debe ser una imagen.');return;}
 if(file.size>15*1024*1024){status('Imagen demasiado grande (máximo 15 MB).');return;}
 button.disabled=true;
 try{
  status('Preparando PaddleOCR… La primera ejecución descarga modelos y puede tardar.');
  if(!paddlePromise)paddlePromise=import('https://esm.sh/@paddleocr/paddleocr-js@0.4.2?bundle').then(async m=>m.PaddleOCR.create({lang:'en',ocrVersion:'PP-OCRv5',ortOptions:{backend:'wasm'}})).catch(e=>{paddlePromise=null;throw e;});
  const ocr=await paddlePromise;
  status('Reconociendo texto de la fotografía…');
  const [result]=await ocr.predict(file);
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
