(()=>{'use strict';const $=id=>document.getElementById(id),token=new URLSearchParams(location.search).get('session');let stream=null,detector=null,channel=null,running=false,lock='',lockAt=0,lastSeen=new Map(),count=0,torch=false,zxingControls=null;const status=t=>$('status').textContent=t;const beep=()=>{try{const a=new (window.AudioContext||window.webkitAudioContext)(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.frequency.value=880;g.gain.value=.08;o.start();o.stop(a.currentTime+.09);setTimeout(()=>a.close(),400)}catch{}};async function onScan(raw){
 raw=String(raw||'').trim();const now=Date.now();
 if(!raw||(lastSeen.has(raw)&&now-lastSeen.get(raw)<12000)||(raw===lock&&now-lockAt<2000))return;
 lastSeen.set(raw,now);lock=raw;lockAt=now;
 for(const [k,t] of lastSeen)if(now-t>60000)lastSeen.delete(k);
 const sent=await channel.send({type:'broadcast',event:'scan',payload:{value:raw,at:now}});
 if(sent==='ok'){count++;$('count').textContent=count;const li=document.createElement('li');li.textContent=new Date().toLocaleTimeString('es-MX',{timeZone:'America/Hermosillo'})+' · '+raw;$('history').prepend(li);beep();navigator.vibrate?.(65);status('✓ Enviado · '+count+' lecturas');}
 else status('Sin conexión con computadora; vuelve a intentar.');
}
async function start(){
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
 stream?.getTracks?.().forEach(t=>t.stop());stream=null;
 $('video').srcObject=null;status('Cámara pausada');
}
async function init(){if(!token||!/^[a-f0-9]{32}$/.test(token)){status('Enlace de vinculación inválido.');return;}try{const sb=window.supabase.createClient(window.GM_SUPABASE_URL,window.GM_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});channel=sb.channel('casetas-lector-'+token,{config:{broadcast:{ack:true}}});channel.on('broadcast',{event:'stop'},()=>{pause();status('La computadora desconectó el lector.');});channel.subscribe(s=>{if(s==='SUBSCRIBED'){status('Conectado con la computadora · Activa la cámara');start();}else if(s==='CHANNEL_ERROR'||s==='TIMED_OUT')status('Sin conexión. Revisa internet y vuelve a abrir el enlace.');});}catch(e){status('Error de conexión: '+e.message)}}$('start').onclick=start;$('pause').onclick=pause;$('torch').onclick=async()=>{try{const t=stream?.getVideoTracks()[0];torch=!torch;await t.applyConstraints({advanced:[{torch}]});}catch{status('Linterna no disponible en este dispositivo.')}};window.addEventListener('pagehide',pause);init();})();