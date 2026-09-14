/* Tráfico App · Diagnóstico visible de correos DOT / mantenimiento */
(function(){
  'use strict';
  if(window.__CC_MAIL_DIAG_V1__)return;
  window.__CC_MAIL_DIAG_V1__=true;

  function install(){
    const sb=window.gmSupabase;
    if(!sb?.functions?.invoke || sb.functions.__ccMailDiagWrapped)return false;
    const original=sb.functions.invoke.bind(sb.functions);
    sb.functions.invoke=async function(name,options){
      const result=await original(name,options);
      try{
        if(name==='cc-send-maintenance-email' && !options?.body?.test){
          const failed=!!result?.error || result?.data?.ok===false;
          if(failed){
            const evento=String(options?.body?.evento||'ENTRADA').toUpperCase();
            const tipo=evento==='DOT'?'DOT':evento==='LIBERACION'?'LIBERACIÓN':'FUERA DE SERVICIO';
            const detail=result?.data?.message || result?.error?.message || result?.data?.error || 'No se pudo completar el envío.';
            const msg='REGISTRO GUARDADO · CORREO NO ENVIADO\n\n'+tipo+'\n'+detail+'\n\nEl error quedó registrado en Supabase para revisión.';
            setTimeout(()=>{ try{ window.showStatus?.('REGISTRO GUARDADO · CORREO NO ENVIADO · '+detail,'error'); }catch{}; try{ alert(msg); }catch{} },0);
          }
        }
      }catch(e){console.warn('Diagnóstico correo:',e);}
      return result;
    };
    sb.functions.__ccMailDiagWrapped=true;
    return true;
  }

  if(!install()){
    const timer=setInterval(()=>{if(install())clearInterval(timer);},300);
    setTimeout(()=>clearInterval(timer),15000);
  }
})();
