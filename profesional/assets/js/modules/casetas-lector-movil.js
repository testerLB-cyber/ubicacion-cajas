(()=>{
'use strict';
const $=id=>document.getElementById(id);
const token=new URLSearchParams(location.search).get('session');
let channel=null,worker=null,workerPromise=null,selectedTotal='',busy=false;
const status=t=>{$('status').textContent=t};
const normalize=s=>String(s||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[|]/g,'I');
function amountOf(input){
 const matches=String(input||'').match(/(?:\$\s*)?\d{1,5}(?:[.,]\d{3})*(?:[.,]\d{1,2})?/g)||[];
 for(const raw of matches){
  let n=raw.replace(/[$\s]/g,'');
  if(/^\d{1,3}(?:[.,]\d{3})+[.,]\d{2}$/.test(n))n=n.replace(/[.,](?=\d{3}[.,])/g,'');
  else if(/^\d{1,3},\d{3}$/.test(n))n=n.replace(',','');
  else if(/^\d{1,5},\d{1,2}$/.test(n))n=n.replace(',','.');
  const value=Number(n);
  if(Number.isFinite(value)&&value>0&&value<=10000)return value.toFixed(2);
 }
 return '';
}
function extractTotal(text){
 const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 for(let i=0;i<lines.length;i++){
  const line=normalize(lines[i]).replace(/T[O0][T7][A4][L1I]/g,'TOTAL').replace(/\s+/g,' ');
  // Only an explicit TOTAL label is accepted; never infer from folio, IVA or subtotal.
  const m=line.match(/(?:^|[^\w])TOTAL\s*[:=$-]?\s*(.*)/);
  if(!m||/\bSUBTOTAL\b/.test(line))continue;
  const value=amountOf(m[1])||amountOf(lines[i+1]||'');
  if(value)return {value,line:lines[i],next:lines[i+1]||''};
 }
 return null;
}
async function ocrWorker(){
 if(worker)return worker;
 if(!workerPromise)workerPromise=(async()=>{
  if(!window.Tesseract?.createWorker)throw Error('No cargó el motor OCR. Revisa tu conexión.');
  status('Cargando OCR para analizar la fotografía…');
  worker=await window.Tesseract.createWorker('spa+eng',1);
  try{await worker.setParameters({tessedit_pageseg_mode:'6'});}catch{}
  return worker;
 })().catch(e=>{workerPromise=null;throw e});
 return workerPromise;
}
async function analyze(){
 const file=$('photo').files?.[0];if(!file)return status('Selecciona una fotografía del ticket.');
 if(!file.type.startsWith('image/')&&!/\.(jpg|jpeg|png|webp)$/i.test(file.name))return status('Elige una imagen JPG, PNG o WebP.');
 if(file.size>15*1024*1024)return status('La foto supera el máximo de 15 MB.');
 if(busy)return;busy=true;selectedTotal='';$('send').disabled=true;$('totalValue').textContent='Analizando…';$('ocrResult').hidden=true;
 $('analyze').disabled=true;const started=performance.now();let img=null;
 try{
  img=await createImageBitmap(file);
  const scale=Math.min(2,1800/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
  const worker=await ocrWorker();let bestText='',match=null;
  for(const deg of [0,90,270]){
   const c=document.createElement('canvas'),side=deg!==0;c.width=side?h:w;c.height=side?w:h;
   const ctx=c.getContext('2d',{willReadFrequently:true});
   ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.translate(c.width/2,c.height/2);ctx.rotate(deg*Math.PI/180);ctx.drawImage(img,-w/2,-h/2,w,h);
   status('Leyendo fotografía'+(deg?' (rotación '+deg+'°)':'')+'…');
   const res=await worker.recognize(c),txt=String(res?.data?.text||'');
   if(txt.trim().length>bestText.trim().length)bestText=txt;
   match=extractTotal(txt);if(match){bestText=txt;break}
  }
  selectedTotal=match?.value||'';
  $('totalValue').textContent=match?'$'+match.value:'No identificado';
  $('ocrResultTotal').textContent=match?'TOTAL: $'+match.value:'TOTAL no identificado';
  $('ocrResultTotal').style.color=match?'#15803d':'#b45309';
  $('ocrResultLine').textContent=match?'Renglón: '+match.line+(match.next?' | Siguiente: '+match.next:''):'Busca una línea que diga TOTAL: seguida del importe.';
  $('ocrResultText').textContent=bestText.trim()||'No se reconoció texto en la imagen.';
  $('ocrResult').hidden=false;
  $('send').disabled=!match||!channel;
  const seconds=((performance.now()-started)/1000).toFixed(1);
  status(match?'✓ TOTAL $'+match.value+' identificado en '+seconds+' s. Revisa el resultado antes de enviarlo.':'No se identificó TOTAL con confianza ('+seconds+' s). Revisa el texto reconocido.');
 }catch(e){status('No se pudo leer la foto: '+e.message);$('totalValue').textContent='Error';}
 finally{img?.close?.();busy=false;$('analyze').disabled=false}
}
async function send(){
 if(!selectedTotal||!channel)return status('No hay un TOTAL confirmado o falta vincular con la computadora.');
 $('send').disabled=true;
 try{
  const result=await channel.send({type:'broadcast',event:'total',payload:{total:selectedTotal,at:Date.now()}});
  if(result!=='ok')throw Error('Sin confirmación: '+result);
  status('✓ TOTAL $'+selectedTotal+' enviado a Observaciones');
 }catch(e){status('No se pudo enviar: '+e.message);$('send').disabled=false}
}
function init(){
 $('analyze').onclick=analyze;$('send').onclick=send;
 $('photo').onchange=()=>{
  selectedTotal='';$('send').disabled=true;$('ocrResult').hidden=true;$('totalValue').textContent='Pendiente de leer';
  const file=$('photo').files?.[0];if(!file)return;
  const preview=$('preview');if(preview.dataset.url)URL.revokeObjectURL(preview.dataset.url);
  preview.dataset.url=URL.createObjectURL(file);preview.src=preview.dataset.url;preview.hidden=false;
  status('Foto seleccionada: '+file.name+' · Presiona Leer TOTAL.');
 };
 window.addEventListener('pagehide',()=>{if($('preview').dataset.url)URL.revokeObjectURL($('preview').dataset.url);worker?.terminate?.()});
 if(!token||!/^[a-f0-9]{32}$/.test(token)){status('Modo de prueba: puedes leer fotos. Para enviar a Observaciones, abre este lector desde Casetas → Comprobación.');return}
 if(!window.supabase?.createClient)return status('Modo de prueba sin conexión: OCR disponible; Supabase no cargó.');
 try{
  const sb=window.supabase.createClient(window.GM_SUPABASE_URL,window.GM_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  channel=sb.channel('casetas-lector-'+token,{config:{broadcast:{ack:true}}});
  channel.on('broadcast',{event:'stop'},()=>{channel=null;$('send').disabled=true;status('La computadora desconectó el lector.')});
  channel.subscribe(state=>{if(state==='SUBSCRIBED'){status('Conectado con Casetas. Selecciona una fotografía.');$('send').disabled=!selectedTotal}
    else if(state==='TIMED_OUT'||state==='CHANNEL_ERROR')status('Sin conexión con la computadora; puedes probar OCR localmente.')});
 }catch(e){status('OCR disponible sin envío: '+e.message)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();