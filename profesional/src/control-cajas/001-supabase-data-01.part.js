/* GM CONTROL DE CAJAS · SUPABASE NORMALIZADO v2.0 · SIN GOOGLE SHEETS */(function(){
const SUPABASE_URL=window.GM_SUPABASE_URL;
const SUPABASE_ANON_KEY=window.GM_SUPABASE_ANON_KEY;
function ccCreateSupabaseClient(){
  if(window.gmSupabase) return window.gmSupabase;
  if(!window.supabase || typeof window.supabase.createClient!=='function'){
    console.error('SUPABASE SDK NO DISPONIBLE');
    return null;
  }
  if(!SUPABASE_URL || !SUPABASE_ANON_KEY){
    console.error('SUPABASE URL/KEY NO DISPONIBLES');
    return null;
  }
  try{
    window.gmSupabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    return window.gmSupabase;
  }catch(err){
    console.error('ERROR CREANDO CLIENTE SUPABASE:',err);
    return null;
  }
}
const gmSupabase=ccCreateSupabaseClient();
window.CC_AUTH_REQUIRED=true;
let cajas=[], responsables=[], rentas=[], matriz={}, clientes=[], configuracion={correosMantenimiento:[],correoEnvio:{proveedor:'RESEND',nombreRemitente:'',correoRemitente:'',replyTo:''},mantenimientoHistorial:[],tarifasRenta:{},geocercas:[],tiposUnidad:[{id:'tipo_caja',nombre:'CAJA',categoria:'CAJA',estatus:'ACTIVO'},{id:'tipo_carro',nombre:'CARRO',categoria:'CARRO',estatus:'ACTIVO'}]};
let ccCloudReady=false,ccRevision=0,ccSaveInFlight=false,ccSaveQueued=false;
const ccDefaultConfig=()=>({correosMantenimiento:[],correoEnvio:{proveedor:'RESEND',nombreRemitente:'',correoRemitente:'',replyTo:''},mantenimientoHistorial:[],tarifasRenta:{},geocercas:[],tiposUnidad:[{id:'tipo_caja',nombre:'CAJA',categoria:'CAJA',estatus:'ACTIVO'},{id:'tipo_carro',nombre:'CARRO',categoria:'CARRO',estatus:'ACTIVO'}]});
function ccNormalizeState(st){
 st=st||{}; cajas=Array.isArray(st.cajas)?st.cajas:[]; responsables=Array.isArray(st.responsables)?st.responsables:[]; rentas=Array.isArray(st.rentas)?st.rentas:[]; matriz=st.matriz&&typeof st.matriz==='object'?st.matriz:{}; clientes=Array.isArray(st.clientes)?st.clientes:[]; configuracion=Object.assign(ccDefaultConfig(),st.configuracion||{});
 configuracion.correosMantenimiento=configuracion.correosMantenimiento||[]; configuracion.correoEnvio=Object.assign({proveedor:'RESEND',nombreRemitente:'',correoRemitente:'',replyTo:''},configuracion.correoEnvio||{}); configuracion.mantenimientoHistorial=configuracion.mantenimientoHistorial||[]; configuracion.tarifasRenta=configuracion.tarifasRenta||{}; configuracion.geocercas=Array.isArray(configuracion.geocercas)?configuracion.geocercas:[]; configuracion.tiposUnidad=configuracion.tiposUnidad||ccDefaultConfig().tiposUnidad;
 if(!configuracion.tiposUnidad.some(t=>String(t.nombre).toUpperCase()==='CAJA'))configuracion.tiposUnidad.unshift({id:'tipo_caja',nombre:'CAJA',categoria:'CAJA',estatus:'ACTIVO'});
 if(!configuracion.tiposUnidad.some(t=>String(t.nombre).toUpperCase()==='CARRO'))configuracion.tiposUnidad.push({id:'tipo_carro',nombre:'CARRO',categoria:'CARRO',estatus:'ACTIVO'});
 Object.keys(configuracion.tarifasRenta).forEach(k=>{const v=configuracion.tarifasRenta[k];if(typeof v==='number')configuracion.tarifasRenta[k]={diario:v,semanal:v*7,mensual:v*30};else configuracion.tarifasRenta[k]=Object.assign({diario:0,semanal:0,mensual:0},v||{});});
 cajas=cajas.map(x=>({...x,tipoUnidadId:x.tipoUnidadId||'tipo_caja',tipoUnidadNombre:x.tipoUnidadNombre||'CAJA'}));
}
function ccState(){return {cajas,responsables,rentas,matriz,clientes,configuracion};}
function ccSupabaseReady(){return !!gmSupabase;}
async function ccTestConnection(){
 if(!ccSupabaseReady()){const msg='Supabase no está configurado. Revisa GM_SUPABASE_URL y GM_SUPABASE_ANON_KEY.';showStatus?.(msg,'error');return {ok:false,error:msg};}
 try{
   showStatus?.('Conectando con Supabase...','info');
   const {data,error}=await gmSupabase.rpc('cc_load_all');
   if(error)throw error;
   ccRevision=Number(data?.revision||0);ccCloudReady=true;
   showStatus?.('CONEXIÓN CORRECTA · Supabase PostgreSQL · revisión '+ccRevision,'success');
   return {ok:true,revision:ccRevision,state:data?.state||{}};
 }catch(e){ccCloudReady=false;console.error('PRUEBA SUPABASE:',e);showStatus?.('ERROR DE CONEXIÓN con Supabase: '+(e.message||e),'error');return {ok:false,error:e.message||String(e)};}
}
async function ccCloudSave(action='GUARDAR'){
 if(!ccSupabaseReady()){
   showStatus?.('Supabase no está configurado. El módulo no puede guardar.','error');
   return {ok:false,error:'SUPABASE_NO_CONFIGURADO'};
 }
 if(ccSaveInFlight){
   ccSaveQueued=true;
   return {ok:false,queued:true};
 }

 ccSaveInFlight=true;
 const payload=ccState();
 showStatus?.('Guardando en Supabase...','info');

 try{
   for(let intento=0;intento<2;intento++){
     const {data,error}=await gmSupabase.rpc('cc_save_all',{
       p_state:payload,
       p_operation:action,
       p_client_time:new Date().toISOString(),
       p_expected_revision:ccRevision
     });
     if(error)throw error;

     if(data?.ok===false){
       if(data.error==='CONFLICTO_DE_VERSION' && intento===0){
         // El servidor ya devuelve la revisión vigente. Se actualiza y reintenta
         // sin descargar toda la base ni perder la captura del usuario.
         ccRevision=Number(data.revision||ccRevision);
         continue;
       }
       throw new Error(data.error||'No se pudo guardar');
     }

     ccRevision=Number(data?.revision??(ccRevision+1));
     if(data?.state) ccNormalizeState(data.state);
     ccCloudReady=true;
     showStatus?.('GUARDADO · Supabase · revisión '+ccRevision,'success');
     return {ok:true,revision:ccRevision,state:data?.state||null};
   }
   throw new Error('No se pudo sincronizar la revisión de Supabase.');
 }catch(e){
   console.error('ERROR GUARDANDO SUPABASE:',e);
   ccCloudReady=false;
   showStatus?.('ERROR: no se guardó en Supabase · '+(e.message||e),'error');
   return {ok:false,error:e.message||String(e)};
 }finally{
   ccSaveInFlight=false;
   if(ccSaveQueued){
     ccSaveQueued=false;
     setTimeout(()=>ccCloudSave('ACTUALIZACION_PENDIENTE'),40);
   }
 }
}
async function ccAudit(evento={}){
 if(!ccSupabaseReady())return {ok:false,error:'Supabase no configurado'};
 const event={...evento,usuario:evento.usuario||'WEB_APP_USER',fechaHora:new Date().toISOString(),origen:evento.origen||'CONTROL_CAJAS_HTML',url:location.href,userAgent:navigator.userAgent};
 try{const {data,error}=await gmSupabase.rpc('cc_log_event',{p_event:event});if(error)throw error;return data||{ok:true};}
 catch(e){console.error('ERROR AUDITORIA SUPABASE:',e);return {ok:false,error:e.message||String(e)};}
}

