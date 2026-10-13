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

let stream=null,watchTimer=null,consecutive=0,lastCandidate='',recognized=false,scanCount=0;
function stopCamera(){clearInterval(watchTimer);watchTimer=null;stream?.getTracks()?.forEach(t=>t.stop());stream=null;$('video').srcObject=null;}
async function processFrame(){
 if(!stream||busy||recognized||document.hidden)return;
 const video=$('video');if(!video.videoWidth||!video.videoHeight)return;
 busy=true;scanCount++;
 try{
  const engine=await ocrWorker();
  const c=document.createElement('canvas');
  const scale=Math.min(1,1400/Math.max(video.videoWidth,video.videoHeight));
  c.width=Math.round(video.videoWidth*scale);c.height=Math.round(video.videoHeight*scale);
  c.getContext('2d',{willReadFrequently:true}).drawImage(video,0,0,c.width,c.height);
  status('Cámara en vivo · OCR lectura '+scanCount+' · Buscando TOTAL:');
  const result=await engine.recognize(c);
  const txt=String(result?.data?.text||''),match=extractTotal(txt);
  $('ocrResult').hidden=false;
  $('ocrResultText').textContent=txt.trim()||'No se reconoció texto en este cuadro.';
  $('ocrResultLine').textContent=match?'Renglón detectado: '+match.line:'Apunta al renglón TOTAL: y mantén el ticket enfocado.';
  if(match){
   if(lastCandidate===match.value)consecutive++;else{lastCandidate=match.value;consecutive=1}
   $('ocrResultTotal').textContent='TOTAL: $'+match.value+' · '+consecutive+'/2 lecturas';
   $('ocrResultTotal').style.color='#15803d';
   $('totalValue').textContent='$'+match.value;
   if(consecutive>=2){
    recognized=true;selectedTotal=match.value;
    $('send').disabled=!channel;
    status('✓ TOTAL $'+match.value+' confirmado en 2 lecturas. Revisa y envía a Observaciones.');
    try{const audio=new (window.AudioContext||window.webkitAudioContext)();await audio.resume();const o=audio.createOscillator();o.connect(audio.destination);o.start();o.stop(audio.currentTime+.15);o.onended=()=>audio.close()}catch{}
   }else status('TOTAL posible: $'+match.value+' · Falta segunda lectura coincidente');
  }else{
   consecutive=0;lastCandidate='';
   $('ocrResultTotal').textContent='TOTAL aún no identificado';
   $('ocrResultTotal').style.color='#b45309';
  }
 }catch(e){status('Error OCR: '+e.message)}
 finally{busy=false}
}
async function openCamera(){
 if(busy)return;
 stopCamera();recognized=false;consecutive=0;lastCandidate='';selectedTotal='';scanCount=0;
 $('send').disabled=true;$('ocrResult').hidden=true;$('totalValue').textContent='Buscando…';
 $('countdown').textContent='Video en vivo · OCR cada 2 segundos · Sin capturar fotos';
 status('Activando cámara…');
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Se requiere HTTPS y permiso para usar la cámara.');
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}});
  const video=$('video');video.srcObject=stream;await video.play();
  status('Cámara activa · Encuadra TOTAL:');
  watchTimer=setInterval(()=>{void processFrame()},2000);
  void processFrame();
 }catch(e){status('No se pudo abrir la cámara: '+e.message);stopCamera()}
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