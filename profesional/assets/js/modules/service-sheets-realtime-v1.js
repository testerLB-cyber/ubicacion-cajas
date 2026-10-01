/* Hojas de servicio: sincronización Realtime ligera.
   Recibe cambios de móvil/web y pide refresco solo cuando la interfaz está libre.
   Nunca cierra modales ni recarga la página. */
(function(){'use strict';
let channel=null,pending=false,timer=null,lastEvent=0;
const modalOpen=()=>!!document.querySelector('.hs-list-modal-open,[role="dialog"].open,.modal.show,.modal.open,.fixed.inset-0:not([style*="display: none"])');
function requestRefresh(){pending=true;lastEvent=Date.now();clearTimeout(timer);timer=setTimeout(flush,350)}
function flush(){
 if(!pending)return;
 if(modalOpen()){timer=setTimeout(flush,700);return}
 pending=false;
 /* Preferir funciones públicas existentes del módulo; no inventar recarga global. */
 const fns=['hs104LoadComprobaciones','hs104Load','hsLoadComprobaciones','hsRefreshComprobaciones','hs104Refresh'];
 for(const n of fns){if(typeof window[n]==='function'){try{window[n]();window.dispatchEvent(new CustomEvent('hs:realtime-updated',{detail:{at:lastEvent}}));return}catch(e){console.warn('Realtime HS:',n,e)}}}
 /* Si el módulo no expone loader, avisar a listeners y dejar intacta la UI. */
 window.dispatchEvent(new CustomEvent('hs:realtime-change',{detail:{at:lastEvent}}));
}
async function start(){
 const sb=window.gmSupabase||window.supabaseClient||window.ccSupabase;if(!sb||typeof sb.channel!=='function'){setTimeout(start,800);return}
 if(channel)return;
 channel=sb.channel('hs-profesional-live-'+Math.random().toString(36).slice(2))
  .on('postgres_changes',{event:'*',schema:'public',table:'hs_comprobaciones'},requestRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'hs_folios'},requestRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'hs_asignaciones_operador'},requestRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'hs_asignacion_folios'},requestRefresh)
  .subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){try{sb.removeChannel(channel)}catch(_){}channel=null;setTimeout(start,1500)}});
 document.addEventListener('click',()=>{if(pending&&!modalOpen())setTimeout(flush,80)},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();