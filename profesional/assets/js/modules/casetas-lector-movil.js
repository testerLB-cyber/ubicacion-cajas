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

let stream=null,watchTimer=null,stableSince=0,previous=null,captured=false;
function stopCamera(){
 clearInterval(watchTimer);watchTimer=null;stableSince=0;previous=null;
 stream?.getTracks().forEach(t=>t.stop());stream=null;
}
function sample(){
 if(!stream||busy||captured)return;
 const video=$('video');if(!video.videoWidth)return;
 const c=$('probe'),ctx=c.getContext('2d',{willReadFrequently:true});
 c.width=100;c.height=140;
 // Analyse the central guide where the user must position the paper.
 ctx.drawImage(video,video.videoWidth*.13,video.videoHeight*.1,video.videoWidth*.74,video.videoHeight*.8,0,0,100,140);
 const pix=ctx.getImageData(0,0,100,140).data,grey=new Uint8Array(14000);
 let brightness=0,contrast=0,edges=0,difference=0;
 for(let i=0;i<grey.length;i++){const j=i*4;const v=Math.round(.299*pix[j]+.587*pix[j+1]+.114*pix[j+2]);grey[i]=v;brightness+=v}
 brightness/=grey.length;
 for(let y=2;y<138;y+=2)for(let x=2;x<98;x+=2){
  const i=y*100+x,v=grey[i];
  contrast+=Math.abs(4*v-grey[i-1]-grey[i+1]-grey[i-100]-grey[i+100]);
  if(Math.abs(v-grey[i-1])>28)edges++;
  if(previous)difference+=Math.abs(v-previous[i]);
 }
 previous=grey;
 const sharp=contrast/((136/2)*(96/2)),edgeRatio=edges/((136/2)*(96/2));
 const motion=difference/((136/2)*(96/2));
 const ok=brightness>55&&brightness<237&&sharp>18&&edgeRatio>.045&&motion<14;
 const now=performance.now();
 if(!ok){stableSince=0;$('countdown').textContent='Acomoda el ticket dentro del recuadro y mantén firme el teléfono';return}
 if(!stableSince)stableSince=now;
 const remaining=Math.max(0,Math.ceil((5000-(now-stableSince))/1000));
 $('countdown').textContent=remaining?'Ticket enfocado · Fotografía automática en '+remaining+' s':'Capturando ticket…';
 if(now-stableSince>=5000){captured=true;void capture();}
}
async function capture(){
 const video=$('video'),canvas=document.createElement('canvas');
 canvas.width=video.videoWidth;canvas.height=video.videoHeight;
 canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
 stopCamera();$('videoWrap').hidden=true;$('capturePreview').src=canvas.toDataURL('image/jpeg',.94);$('capturePreview').hidden=false;
 await analyzeCanvas(canvas);
}
async function analyzeCanvas(source){
 if(busy)return;busy=true;selectedTotal='';$('send').disabled=true;$('ocrResult').hidden=true;
 const started=performance.now();
 try{
  const scale=Math.min(1,1800/Math.max(source.width,source.height)),w=Math.max(1,Math.round(source.width*scale)),h=Math.max(1,Math.round(source.height*scale));
  const engine=await ocrWorker();let bestText='',match=null;
  for(const deg of [0,90,270]){
   const c=document.createElement('canvas'),side=deg!==0;c.width=side?h:w;c.height=side?w:h;
   const ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);
   ctx.translate(c.width/2,c.height/2);ctx.rotate(deg*Math.PI/180);ctx.drawImage(source,-w/2,-h/2,w,h);
   status('Analizando ticket capturado'+(deg?' · girado '+deg+'°':'')+'…');
   const res=await engine.recognize(c),txt=String(res?.data?.text||'');
   if(txt.trim().length>bestText.trim().length)bestText=txt;
   match=extractTotal(txt);if(match){bestText=txt;break}
  }
  selectedTotal=match?.value||'';
  $('totalValue').textContent=match?'$'+match.value:'No identificado';
  $('ocrResultTotal').textContent=match?'TOTAL: $'+match.value:'TOTAL no identificado';
  $('ocrResultTotal').style.color=match?'#15803d':'#b45309';
  $('ocrResultLine').textContent=match?'Renglón: '+match.line:'El OCR no identificó con confianza un importe junto a TOTAL:';
  $('ocrResultText').textContent=bestText.trim()||'No se reconoció texto en el ticket.';
  $('ocrResult').hidden=false;$('send').disabled=!match||!channel;
  const secs=((performance.now()-started)/1000).toFixed(1);
  status(match?'TOTAL encontrado en '+secs+' s. Verifica el resultado antes de enviarlo.':'No se encontró TOTAL ('+secs+' s). Puedes repetir la captura.');
 }catch(e){status('No se pudo analizar el ticket: '+e.message)}
 finally{busy=false}
}
async function openCamera(){
 if(busy)return;stopCamera();captured=false;$('ocrResult').hidden=true;$('capturePreview').hidden=true;$('videoWrap').hidden=false;
 $('countdown').textContent='Coloca el ticket dentro del recuadro';status('Activando cámara…');
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('La cámara requiere HTTPS y permiso del navegador.');
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}});
  $('video').srcObject=stream;await $('video').play();
  watchTimer=setInterval(sample,250);
  status('Encuadra el ticket; al quedar enfocado y estable se capturará en 5 segundos.');
 }catch(e){status('Error al abrir cámara: '+e.message);$('countdown').textContent='Presiona Reintentar para dar permiso a la cámara.'}
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
 $('retry').onclick=()=>void openCamera();
 $('send').onclick=send;
 window.addEventListener('pagehide',()=>{stopCamera();worker?.terminate?.()});
 void openCamera();
 if(!token||!/^[a-f0-9]{32}$/.test(token)){status('Encuadra el ticket. Para enviar el TOTAL a Observaciones, abre desde Casetas → Comprobación.');return}
 if(!window.supabase?.createClient)return;
 try{
  const sb=window.supabase.createClient(window.GM_SUPABASE_URL,window.GM_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  channel=sb.channel('casetas-lector-'+token,{config:{broadcast:{ack:true}}});
  channel.on('broadcast',{event:'stop'},()=>{$('send').disabled=true;channel=null;status('La computadora desconectó el lector.')});
  channel.subscribe(state=>{if(state==='SUBSCRIBED'){$('send').disabled=!selectedTotal} });
 }catch(e){console.warn('Conexión para envío no disponible',e)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();