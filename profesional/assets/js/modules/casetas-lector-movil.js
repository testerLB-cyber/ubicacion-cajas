(()=>{'use strict';const $=id=>document.getElementById(id),token=new URLSearchParams(location.search).get('session');let stream=null,detector=null,channel=null,running=false,lock='',lockAt=0,lastSeen=new Map(),count=0,torch=false,zxingControls=null;const status=t=>$('status').textContent=t;let audioContext=null,ocrWorker=null,ocrBusy=false,lastQr='',lastQrAt=0,lastTotal='',lastTotalAt=0,ocrLoading=null,qrStarted=0,ocrStarted=0,ocrMs=0,lastAngle=0,stats=[];
function unlockAudio(){try{audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});}catch{}}
function beep(){
 try{
  unlockAudio();if(!audioContext)return;
  const now=audioContext.currentTime;
  for(const [delay,freq,duration] of [[0,1050,.13],[.17,1350,.19]]){
   const osc=audioContext.createOscillator(),gain=audioContext.createGain();
   osc.type='square';osc.frequency.setValueAtTime(freq,now+delay);
   gain.gain.setValueAtTime(.0001,now+delay);
   gain.gain.exponentialRampToValueAtTime(.24,now+delay+.015);
   gain.gain.exponentialRampToValueAtTime(.0001,now+delay+duration);
   osc.connect(gain);gain.connect(audioContext.destination);
   osc.start(now+delay);osc.stop(now+delay+duration+.015);
  }
 }catch{}
}
function feedback(){beep();try{if(typeof navigator.vibrate==='function')navigator.vibrate([180,75,220]);}catch{}}
function extractTotal(text){
 const lines=String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 for(let i=0;i<lines.length;i++){
  const s=lines[i].toUpperCase().replace(/T0TAL/g,'TOTAL');
  const m=s.match(/\bTOTAL\s*[:=$-]?\s*(.*)/);
  if(!m)continue;
  const candidate=m[1].trim()||lines[i+1]||'';
  const amount=candidate.match(/\$?\s*(\d{1,5}(?:[.,]\d{3})*[.,]\d{2}|\d{1,5})\b/);
  if(!amount)continue;
  let n=amount[1].replace(/,/g,'.');const value=Number(n);
  if(value>0&&value<=10000)return value.toFixed(2);
 }
 return '';
}
async function onScan(raw){
 raw=String(raw||'').trim();const now=Date.now();
 if(!raw||(raw===lastQr&&now-lastQrAt<15000))return;
 lastQr=raw;lastQrAt=now;qrStarted=performance.now();ocrStarted=0;
 status('✓ QR leído. Buscando campo TOTAL…');
 $('qrValue').textContent=raw;
 await sendPair();
}
async function sendPair(){
 if(!lastQr||!lastTotal||Date.now()-lastQrAt>90000||Date.now()-lastTotalAt>90000)return;
 const raw=lastQr,total=lastTotal;const sendStarted=performance.now();
 const sent=await channel.send({type:'broadcast',event:'ticket',payload:{qr:raw,total,at:Date.now()}});
 if(sent==='ok'){
  count++;$('count').textContent=count;
  const li=document.createElement('li');li.textContent='QR: '+raw+' · TOTAL: $'+total;$('history').prepend(li);
  const totalMs=Math.round(performance.now()-qrStarted),sendMs=Math.round(performance.now()-sendStarted);stats.push(totalMs);if(stats.length>30)stats.shift();const avg=Math.round(stats.reduce((a,b)=>a+b,0)/stats.length);$('timing').textContent='QR → TOTAL → envío: '+(totalMs/1000).toFixed(1)+' s · OCR: '+(ocrMs/1000).toFixed(1)+' s · Red: '+(sendMs/1000).toFixed(1)+' s · Promedio: '+(avg/1000).toFixed(1)+' s ('+stats.length+' tickets)';feedback();status('✓ QR + TOTAL 
  lastQr='';lastTotal='';$('qrValue').textContent='Esperando QR…';$('totalValue').textContent='Esperando TOTAL…';
 }else status('Sin conexión; vuelve a intentar.');
}
async function initOCR(){
 if(ocrWorker)return ocrWorker;
 if(!ocrLoading)ocrLoading=(async()=>{
  status('Preparando OCR en el celular (primera vez puede tardar)…');
  if(!window.Tesseract?.createWorker)throw new Error('No se cargó el OCR. Revisa internet.');
  ocrWorker=await window.Tesseract.createWorker('eng',1);\n  try{await ocrWorker.setParameters({tessedit_pageseg_mode:'6'});}catch{}
  return ocrWorker;
 })().catch(e=>{ocrLoading=null;throw e;});
 return ocrLoading;
}
async function scanTotal(){
 if(!running||ocrBusy||!lastQr||lastTotal)return;
 const video=$('video');if(!video.videoWidth||!video.videoHeight)return;
 ocrBusy=true;
 try{
  const worker=await initOCR();
  if(!ocrStarted)ocrStarted=performance.now();\n  const canvas=document.createElement('canvas');
  const scale=Math.min(1,960/Math.max(video.videoWidth,video.videoHeight));
  canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
  let total='';
  for(const angle of [lastAngle,...[0,90,270].filter(a=>a!==lastAngle)]){
   const img=document.createElement('canvas'),side=angle!==0;
   img.width=side?canvas.height:canvas.width;img.height=side?canvas.width:canvas.height;
   const ctx=img.getContext('2d');ctx.translate(img.width/2,img.height/2);ctx.rotate(angle*Math.PI/180);ctx.drawImage(canvas,-canvas.width/2,-canvas.height/2);
   const result=await worker.recognize(img);
   total=extractTotal(result?.data?.text);
   if(total){lastAngle=angle;break;}
  }
  if(total){ocrMs=Math.round(performance.now()-ocrStarted);lastTotal=total;lastTotalAt=Date.now();$('totalValue').textContent='$'+total;await sendPair();}
  else status('QR detectado. Apunta al texto TOTAL del ticket; buscando…');
 }catch(e){status('OCR: '+e.message);}
 finally{ocrBusy=false;}
}
setInterval(()=>{if(running&&lastQr&&!lastTotal)scanTotal();},450);
async function start(){
 unlockAudio();
 if(running)return;
 if(!navigator.mediaDevices?.getUserMedia){status('La cámara requiere HTTPS y permisos del navegador.');return;}
 try{
  if('BarcodeDetector'in window){
   try{detector=new BarcodeDetector({formats:['qr_code','code_128','code_39','ean_13','ean_8','itf','pdf417','data_matrix','upc_a','upc_e']});}catch{detector=null;}
  }
  if(detector){
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
   $('video').srcObject=stream;await $('video').play();running=true;status('Cámara activa · Lectura continua');loop();return;
  }
  if(!window.ZXingBrowser?.BrowserMultiFormatReader){status('No se pudo cargar el lector compatible con iPhone. Verifica la conexión a internet y recarga.');return;}
  running=true;initOCR().catch(e=>status('OCR: '+e.message));status('Iniciando cámara compatible con iPhone…');
  const reader=new window.ZXingBrowser.BrowserMultiFormatReader();
  zxingControls=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}},$('video'),(result,error,controls)=>{
   if(result&&running)onScan(result.getText()).catch(e=>status('Error de envío: '+e.message));
  });
  stream=$('video').srcObject;status('Cámara activa · Lectura continua (iPhone/Android)');
 }catch(e){running=false;status('No se pudo abrir la cámara: '+e.message);}
}
async function loop(){
 if(!running||!detector)return;
 try{const results=await detector.detect($('video'));if(results.length)await onScan(results[0].rawValue);}
 catch(e){status('Error de lectura: '+e.message);}
 if(running)setTimeout(loop,190);
}
function pause(){
 running=false;
 try{zxingControls?.stop()}catch{}zxingControls=null;
 stream?.getTracks?.().forEach(t=>t.stop());stream=null;lastQr='';lastTotal='';ocrStarted=0;
 $('video').srcObject=null;status('Cámara pausada');
}
async function init(){if(!token||!/^[a-f0-9]{32}$/.test(token)){status('Enlace de vinculación inválido.');return;}try{const sb=window.supabase.createClient(window.GM_SUPABASE_URL,window.GM_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});channel=sb.channel('casetas-lector-'+token,{config:{broadcast:{ack:true}}});channel.on('broadcast',{event:'stop'},()=>{pause();status('La computadora desconectó el lector.');});channel.subscribe(s=>{if(s==='SUBSCRIBED'){status('Conectado con la computadora · Activa la cámara');start();}else if(s==='CHANNEL_ERROR'||s==='TIMED_OUT')status('Sin conexión. Revisa internet y vuelve a abrir el enlace.');});}catch(e){status('Error de conexión: '+e.message)}}$('start').onclick=start;$('pause').onclick=pause;$('torch').onclick=async()=>{try{const t=stream?.getVideoTracks()[0];torch=!torch;await t.applyConstraints({advanced:[{torch}]});}catch{status('Linterna no disponible en este dispositivo.')}};window.addEventListener('pagehide',pause);init();})();+total+' enviados a Observaciones');
  lastQr='';lastTotal='';$('qrValue').textContent='Esperando QR…';$('totalValue').textContent='Esperando TOTAL…';
 }else status('Sin conexión; vuelve a intentar.');
}
async function initOCR(){
 if(ocrWorker)return ocrWorker;
 if(!ocrLoading)ocrLoading=(async()=>{
  status('Preparando OCR en el celular (primera vez puede tardar)…');
  if(!window.Tesseract?.createWorker)throw new Error('No se cargó el OCR. Revisa internet.');
  ocrWorker=await window.Tesseract.createWorker('spa+eng',1);
  return ocrWorker;
 })().catch(e=>{ocrLoading=null;throw e;});
 return ocrLoading;
}
async function scanTotal(){
 if(!running||ocrBusy||!lastQr||lastTotal)return;
 const video=$('video');if(!video.videoWidth||!video.videoHeight)return;
 ocrBusy=true;
 try{
  const worker=await initOCR();
  const canvas=document.createElement('canvas');
  const scale=Math.min(1,1200/Math.max(video.videoWidth,video.videoHeight));
  canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
  let total='';
  for(const angle of [0,90,270]){
   const img=document.createElement('canvas'),side=angle!==0;
   img.width=side?canvas.height:canvas.width;img.height=side?canvas.width:canvas.height;
   const ctx=img.getContext('2d');ctx.translate(img.width/2,img.height/2);ctx.rotate(angle*Math.PI/180);ctx.drawImage(canvas,-canvas.width/2,-canvas.height/2);
   const result=await worker.recognize(img);
   total=extractTotal(result?.data?.text);
   if(total)break;
  }
  if(total){lastTotal=total;lastTotalAt=Date.now();$('totalValue').textContent='$'+total;await sendPair();}
  else status('QR detectado. Apunta al texto TOTAL del ticket; buscando…');
 }catch(e){status('OCR: '+e.message);}
 finally{ocrBusy=false;}
}
setInterval(()=>{if(running&&lastQr&&!lastTotal)scanTotal();},1600);
async function start(){
 unlockAudio();
 if(running)return;
 if(!navigator.mediaDevices?.getUserMedia){status('La cámara requiere HTTPS y permisos del navegador.');return;}
 try{
  if('BarcodeDetector'in window){
   try{detector=new BarcodeDetector({formats:['qr_code','code_128','code_39','ean_13','ean_8','itf','pdf417','data_matrix','upc_a','upc_e']});}catch{detector=null;}
  }
  if(detector){
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
   $('video').srcObject=stream;await $('video').play();running=true;status('Cámara activa · Lectura continua');loop();return;
  }
  if(!window.ZXingBrowser?.BrowserMultiFormatReader){status('No se pudo cargar el lector compatible con iPhone. Verifica la conexión a internet y recarga.');return;}
  running=true;status('Iniciando cámara compatible con iPhone…');
  const reader=new window.ZXingBrowser.BrowserMultiFormatReader();
  zxingControls=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}},$('video'),(result,error,controls)=>{
   if(result&&running)onScan(result.getText()).catch(e=>status('Error de envío: '+e.message));
  });
  stream=$('video').srcObject;status('Cámara activa · Lectura continua (iPhone/Android)');
 }catch(e){running=false;status('No se pudo abrir la cámara: '+e.message);}
}
async function loop(){
 if(!running||!detector)return;
 try{const results=await detector.detect($('video'));if(results.length)await onScan(results[0].rawValue);}
 catch(e){status('Error de lectura: '+e.message);}
 if(running)setTimeout(loop,190);
}
function pause(){
 running=false;
 try{zxingControls?.stop()}catch{}zxingControls=null;
 stream?.getTracks?.().forEach(t=>t.stop());stream=null;lastQr='';lastTotal='';
 $('video').srcObject=null;status('Cámara pausada');
}
async function init(){if(!token||!/^[a-f0-9]{32}$/.test(token)){status('Enlace de vinculación inválido.');return;}try{const sb=window.supabase.createClient(window.GM_SUPABASE_URL,window.GM_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});channel=sb.channel('casetas-lector-'+token,{config:{broadcast:{ack:true}}});channel.on('broadcast',{event:'stop'},()=>{pause();status('La computadora desconectó el lector.');});channel.subscribe(s=>{if(s==='SUBSCRIBED'){status('Conectado con la computadora · Activa la cámara');start();}else if(s==='CHANNEL_ERROR'||s==='TIMED_OUT')status('Sin conexión. Revisa internet y vuelve a abrir el enlace.');});}catch(e){status('Error de conexión: '+e.message)}}$('start').onclick=start;$('pause').onclick=pause;$('torch').onclick=async()=>{try{const t=stream?.getVideoTracks()[0];torch=!torch;await t.applyConstraints({advanced:[{torch}]});}catch{status('Linterna no disponible en este dispositivo.')}};window.addEventListener('pagehide',pause);init();})();