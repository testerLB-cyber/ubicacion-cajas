(()=>{
'use strict';
const $=id=>document.getElementById(id);
const token=new URLSearchParams(location.search).get('session');
const status=message=>{const e=$('status');if(e)e.textContent=message;};
let channel=null,stream=null,detector=null,zxingControls=null,worker=null,workerPromise=null;
let running=false,starting=false,ocrBusy=false,lastQr='',qrAt=0,lastTotal='',totalAt=0,lastRead='',lastReadAt=0,count=0,ocrStart=0,scanStart=0,torch=false,loopTimer=null;
let frames=0,ocrAttempts=0,qrEngine='Sin iniciar',connectionState='Conectando',lastOcrError='',lastOcrText='';
function diagnostic(){const el=$('diagnostic');if(!el)return;el.textContent='Cámara: '+(running?'ACTIVA':'PAUSADA')+' · Ciclos (1/s): '+frames+' · Modo: OCR TOTAL'+' · OCR: '+(ocrBusy?'leyendo…':ocrAttempts+' intentos')+' · Conexión: '+connectionState+(lastOcrError?' · Error OCR: '+lastOcrError:'')+(lastOcrText?' · Texto OCR: '+lastOcrText:'');}

const amounts=text=>{
 const lines=String(text||'').split(/\r?\n/).map(x=>x.toUpperCase().replace(/T[O0]T[A4][L1I]/g,'TOTAL').trim()).filter(Boolean);
 for(let i=0;i<lines.length;i++){
  const m=lines[i].match(/\bTOTAL\b\s*[:=$-]?\s*(.*)/);
  if(!m)continue;
  const target=(m[1]||'').trim()||lines[i+1]||'';
  const n=target.match(/\$?\s*(\d{1,5}(?:[.,]\d{3})*[.,]\d{2}|\d{1,5}[.,]\d{2})\b/);
  if(n){
   let v=n[1].replace(/\s/g,'');
   if(v.includes(',')&&v.includes('.'))v=v.replace(/,/g,'');else if(v.includes(','))v=v.replace(',','.');
   const amount=Number(v);if(amount>0&&amount<=10000)return amount.toFixed(2);
  }
 }
 return '';
};
let audio=null;
function feedback(){
 try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();audio.resume?.();const t=audio.currentTime;for(const [d,f] of [[0,1000],[.17,1350]]){const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=f;g.gain.value=.08;o.connect(g);g.connect(audio.destination);o.start(t+d);o.stop(t+d+.13);}}catch{}
 try{navigator.vibrate?.([150,70,150]);}catch{}
}
async function sendPair(){
 if(!channel||!lastTotal)return;
 const total=lastTotal;
 try{
  const result=await channel.send({type:'broadcast',event:'total',payload:{total,at:Date.now()}});
  if(result!=='ok')throw Error('Envío no confirmado: '+result);
  count++;$('count').textContent=String(count);
  const item=document.createElement('li');item.textContent='TOTAL: $'+total;$('history').prepend(item);
  status('TOTAL $'+total+' enviado a Observaciones');feedback();
 }catch(e){status('TOTAL $'+total+' leído; error al enviar: '+e.message);}
}
async function onScan(value){
 value=String(value||'').trim().slice(0,400);const now=Date.now();
 if(!value||value===lastRead&&now-lastReadAt<12000||lastQr)return;
 lastRead=value;lastReadAt=now;lastQr=value;qrAt=now;scanStart=performance.now();ocrStart=0;
 $('qrValue').textContent=value;feedback();status(lastTotal?'✓ QR y TOTAL reconocidos':'✓ QR detectado · Enfoca ahora el campo TOTAL');await sendPair();
}
async function getWorker(){
 if(worker)return worker;
 if(!workerPromise)workerPromise=(async()=>{
  if(!window.Tesseract?.createWorker)throw new Error('No cargó Tesseract OCR. Revisa conexión.');
  status('Cargando reconocimiento OCR…');
  const w=await window.Tesseract.createWorker('eng',1);
  try{await w.setParameters({tessedit_pageseg_mode:'6'});}catch{}
  worker=w;return worker;
 })().catch(e=>{workerPromise=null;throw e;});
 return workerPromise;
}
async function readTotal(){
 if(!running||ocrBusy||lastTotal)return;
 const v=$('video');if(!v.videoWidth||!v.videoHeight)return;
 ocrBusy=true;ocrAttempts++;diagnostic();try{
  const w=await getWorker();if(!ocrStart)ocrStart=performance.now();
  const base=document.createElement('canvas');const scale=Math.min(1,1100/Math.max(v.videoWidth,v.videoHeight));
  base.width=Math.max(1,Math.round(v.videoWidth*scale));base.height=Math.max(1,Math.round(v.videoHeight*scale));
  base.getContext('2d').drawImage(v,0,0,base.width,base.height);
  for(const angle of [0,90,270]){
   if(!running||lastTotal)break;
   const c=document.createElement('canvas'),rotated=angle!==0;
   c.width=rotated?base.height:base.width;c.height=rotated?base.width:base.height;
   const ctx=c.getContext('2d');ctx.translate(c.width/2,c.height/2);ctx.rotate(angle*Math.PI/180);ctx.drawImage(base,-base.width/2,-base.height/2);
   const res=await w.recognize(c);lastOcrText=String(res?.data?.text||'').replace(/\s+/g,' ').slice(0,130);diagnostic();const total=amounts(res?.data?.text);
   if(total){lastTotal=total;totalAt=Date.now();feedback();$('totalValue').textContent='$'+total;await sendPair();break;}
  }
  if(!lastTotal)status('Enfoca la palabra TOTAL: y el importe');
 }catch(e){lastOcrError=String(e.message||e);status('Error OCR: '+lastOcrError);}finally{ocrBusy=false;diagnostic();}
}
function stop(){
 running=false;diagnostic();starting=false;clearTimeout(loopTimer);
 
 try{stream?.getTracks()?.forEach(t=>t.stop());}catch{}stream=null;
 $('video').srcObject=null;lastTotal='';$('totalValue').textContent='Esperando TOTAL…';
 status('Cámara pausada · Pulsa Iniciar cámara para reanudar');
}
function scanLoop(){
 if(!running)return;
 frames++;if(frames%5===0)diagnostic();
 if(!ocrBusy&&!lastTotal)void readTotal();
 if(running)loopTimer=setTimeout(scanLoop,1000);
}
async function start(){
 if(running||starting)return;
 starting=true;
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Cámara no disponible. Usa HTTPS y permite el acceso.');
  status('Iniciando cámara OCR…');
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
  const video=$('video');video.srcObject=stream;await video.play();
  running=true;scanStart=performance.now();lastTotal='';
  status('Cámara activa · Leyendo TOTAL: cada segundo');diagnostic();scanLoop();
 }catch(e){running=false;status('Error de cámara: '+e.message);try{stream?.getTracks()?.forEach(t=>t.stop())}catch{}stream=null;}
 finally{starting=false;}
}
async function init(){
 $('start').addEventListener('click',start);$('pause').addEventListener('click',stop);
 $('torch').addEventListener('click',async()=>{try{const t=stream?.getVideoTracks()?.[0];if(!t)throw new Error('Primero enciende cámara');torch=!torch;await t.applyConstraints({advanced:[{torch}]});}catch(e){status('Linterna: '+e.message);}});
 window.addEventListener('pagehide',stop);
 if(!token||!/^[a-f0-9]{32}$/.test(token)){status('Vínculo inválido. Genera otro QR en la computadora.');return;}
 if(!window.supabase?.createClient){status('No cargó la conexión a Supabase. Recarga.');return;}
 try{
  const sb=window.supabase.createClient(window.GM_SUPABASE_URL,window.GM_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  channel=sb.channel('casetas-lector-'+token,{config:{broadcast:{ack:true}}});
  channel.on('broadcast',{event:'stop'},()=>{stop();status('La computadora desconectó el lector.');});
  channel.subscribe(state=>{connectionState=state;diagnostic();
   if(state==='SUBSCRIBED'){status('Conectado · Pulsa Iniciar cámara');}
   else if(state==='TIMED_OUT'||state==='CHANNEL_ERROR'||state==='CLOSED')status('Fallo de conexión ('+state+'). Revisa WiFi/datos.');
  });
  setTimeout(()=>{if(!running&&$('status').textContent==='Conectando…')status('La conexión está tardando. Comprueba internet y pulsa Iniciar cámara.');},8000);
 }catch(e){status('Error de conexión: '+e.message);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();