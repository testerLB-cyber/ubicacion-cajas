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

let stream=null,watchTimer=null,stableAt=0,lastFrame=null,capturing=false,lastResult='',awaitingNext=false,previousTicketFrame=null,changedFrames=0;
function stopCamera(){clearInterval(watchTimer);watchTimer=null;stream?.getTracks()?.forEach(t=>t.stop());stream=null;}
function detectStableTicket(){
 if(!stream||busy||capturing||document.hidden)return;
 const v=$('video');if(!v.videoWidth||!v.videoHeight)return;
 const canvas=$('probe');canvas.width=120;canvas.height=160;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(v,v.videoWidth*.14,v.videoHeight*.1,v.videoWidth*.72,v.videoHeight*.8,0,0,120,160);
 const d=ctx.getImageData(0,0,120,160).data,gray=new Uint8Array(120*160);
 let light=0,sharpness=0,diff=0,edges=0,n=0;
 for(let i=0;i<gray.length;i++){gray[i]=Math.round((d[i*4]*.299)+(d[i*4+1]*.587)+(d[i*4+2]*.114));light+=gray[i]}
 light/=gray.length;
 for(let y=2;y<158;y+=2)for(let x=2;x<118;x+=2){
  const i=y*120+x,v0=gray[i];sharpness+=Math.abs(4*v0-gray[i-1]-gray[i+1]-gray[i-120]-gray[i+120]);
  if(Math.abs(v0-gray[i-1])>25)edges++;
  if(lastFrame)diff+=Math.abs(v0-lastFrame[i]);n++;
 }
 const motion=lastFrame&&n?diff/n:99;
 lastFrame=gray;
 if(awaitingNext){
  let delta=0,samples=0;
  if(previousTicketFrame)for(let i=0;i<gray.length;i+=8){delta+=Math.abs(gray[i]-previousTicketFrame[i]);samples++}
  changedFrames=(samples&&delta/samples>23)?changedFrames+1:0;
  if(changedFrames>=2){awaitingNext=false;previousTicketFrame=null;changedFrames=0;stableAt=0;status('Nuevo ticket · Enfocando…')}
  else{$('countdown').textContent='✓ Registrado · Retira el ticket y coloca el siguiente';return}
 }
 const plausible=light>50&&light<240&&sharp>26&&edges/n>.055&&motion<16;
 if(!plausible){stableAt=0;$('countdown').textContent='Encuadra el ticket con buena luz y mantén el teléfono firme';return}
 if(!stableAt)stableAt=performance.now();
 const elapsed=performance.now()-stableAt;
 $('countdown').textContent='Ticket estable · Captura automática en '+Math.max(1,Math.ceil((500-elapsed)/1000))+' s';
 if(elapsed>=500)void captureTicket();
}
async function captureTicket(){
 if(capturing||busy||!stream)return;
 capturing=true;
 const v=$('video'),shot=document.createElement('canvas');
 shot.width=v.videoWidth;shot.height=v.videoHeight;
 shot.getContext('2d').drawImage(v,0,0,shot.width,shot.height);
 previousTicketFrame=lastFrame?.slice()||null;
 $('countdown').textContent='Foto capturada · Leyendo TOTAL…';
 // Keep the camera open to scan the next ticket immediately.
 busy=true;const started=performance.now();
 try{
  const engine=await ocrWorker();let best='',match=null;
  const scale=Math.min(1,1280/Math.max(shot.width,shot.height)),w=Math.max(1,Math.round(shot.width*scale)),h=Math.max(1,Math.round(shot.height*scale));
  // Quick pass: upright ticket at reduced resolution. Only retry other orientations if TOTAL is missing.
  for(const rotation of [0,90,270]){
   const canvas=document.createElement('canvas'),side=rotation!==0;
   canvas.width=side?h:w;canvas.height=side?w:h;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});
   ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(rotation*Math.PI/180);ctx.drawImage(shot,-w/2,-h/2,w,h);
   status('OCR: buscando TOTAL'+(rotation?' · giro '+rotation+'°':'')+'…');
   const result=await engine.recognize(canvas),txt=String(result?.data?.text||'');
   if(txt.length>best.length)best=txt;
   match=extractTotal(txt);if(match){best=txt;break}
  }
  $('ocrResult').hidden=false;
  $('ocrResultText').textContent=best||'No se logró leer texto legible.';
  $('ocrResultLine').textContent=match?'Renglón: '+match.line:'No se encontró el campo TOTAL. Puedes reintentar.';
  if(!match){status('No se pudo identificar TOTAL. Prueba mejor iluminación y reintenta.');$('ocrResultTotal').textContent='TOTAL no detectado';return}
  selectedTotal=match.value;
  $('totalValue').textContent='$'+selectedTotal;
  $('ocrResultTotal').textContent='TOTAL: $'+selectedTotal;
  $('ocrResultTotal').style.color='#15803d';
  status('✓ TOTAL $'+selectedTotal+' detectado en '+((performance.now()-started)/1000).toFixed(1)+' s · Enviando…');
  try{
   const ac=new (window.AudioContext||window.webkitAudioContext)();await ac.resume();
   for(const [delay,hz] of [[0,900],[.18,1300],[.36,900]]){const osc=ac.createOscillator(),gain=ac.createGain();osc.frequency.value=hz;gain.gain.value=.16;osc.connect(gain);gain.connect(ac.destination);osc.start(ac.currentTime+delay);osc.stop(ac.currentTime+delay+.13)}
   setTimeout(()=>ac.close(),1000);
  }catch{}
  try{navigator.vibrate?.([130,80,130])}catch{}
  const delivered=await send();
  if(delivered){awaitingNext=true;changedFrames=0;$('countdown').textContent='✓ Guardado en Observaciones · Retira el ticket y coloca el siguiente'}
 }catch(e){status('Error al reconocer el ticket: '+e.message)}
 finally{busy=false;capturing=false;stableAt=0}
}
async function openCamera(){
 if(busy)return;
 stopCamera();capturing=false;stableAt=0;lastFrame=null;selectedTotal='';awaitingNext=false;previousTicketFrame=null;changedFrames=0;
 $('ocrResult').hidden=true;$('capturePreview').hidden=true;$('videoWrap').hidden=false;
 $('totalValue').textContent='Buscando…';$('countdown').textContent='Encuadra el ticket; captura automática al estabilizarse';
 status('Abriendo cámara automáticamente…');
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Permite el uso de la cámara en un sitio HTTPS.');
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
  const video=$('video');video.srcObject=stream;await video.play();
  void ocrWorker().catch(e=>console.warn('OCR_PRELOAD',e));
  status('Cámara activa · Esperando imagen estable y enfocada');
  watchTimer=setInterval(detectStableTicket,250);
 }catch(e){status('No se pudo abrir la cámara: '+e.message);stopCamera()}
}
async function send(){
 if(!selectedTotal||!channel){status('No hay un TOTAL confirmado o falta vincular con la computadora.');return false;}
 $('send').disabled=true;
 try{
  const result=await channel.send({type:'broadcast',event:'total',payload:{total:selectedTotal,at:Date.now(),scanId:crypto.randomUUID?.()||String(Date.now())}});
  if(result!=='ok')throw Error('Sin confirmación: '+result);
  status('✓ TOTAL 
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
})();+selectedTotal+' enviado a Observaciones');return true;
 }catch(e){status('No se pudo enviar: '+e.message);$('send').disabled=false;return false}
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