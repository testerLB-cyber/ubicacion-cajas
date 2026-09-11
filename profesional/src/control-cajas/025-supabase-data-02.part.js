    ccMarkSectionFresh('refresh_'+sectionName);showStatus?.('ACTUALIZADO · '+sectionName+' · revisión '+ccRevision,'success');
  }catch(err){
    console.error('REFRESH VISIBLE:',err);
    showStatus?.('ERROR AL ACTUALIZAR · '+(err.message||err),'error');
    alert('No se pudo actualizar la información.\n\n'+(err.message||err));
  }finally{
    if(btn){
      btn.disabled=false;
      btn.innerHTML='<i class="fa-solid fa-rotate mr-1"></i>Refresh';
    }
  }
};

function ccRenderAll(){
  try{ if(typeof ccRenderTipoButtons==='function') ccRenderTipoButtons(); }catch(_){}
  const active=document.querySelector('#controlCajasSection .cc-panel.active');
  const id=active?.id||'ccPanelDashboard';
  if(id==='ccPanelDashboard') return ccRenderDashboard();
  if(id==='ccPanelInventario') return ccRenderInventario();
  if(id==='ccPanelRenta') return ccRenderRenta();
  if(id==='ccPanelHistorial') return ccRenderHistorial();
  if(id==='ccPanelMantenimiento'){ccMostrarMantenimientoHistorial();return ccRenderMantenimiento();}
  if(id==='ccPanelMapa') return ccCargarMapaUnidades();
  if(id==='ccPanelConfiguracion'){ccRenderConfiguracion();return;}
  if(id==='ccPanelProforma' && typeof ccRenderProforma==='function') return ccRenderProforma();
  ccRenderDashboard();
}
window.ccRenderAll=ccRenderAll;
async function ccInitCloud(){
  if(window.CC_AUTH_REQUIRED&&!window.CC_AUTH_READY)return;
  ccNormalizeState({});
  if(!ccSupabaseReady()){ccRenderAll();showStatus?.('Falta configurar Supabase.','error');return;}
  try{
    const r=await ccTestConnection();
    if(!r.ok)throw new Error(r.error||'No se pudo leer Supabase');
    ccRevision=Number(r.revision||0);
    ccNormalizeState(r.state||{});
    ccRenderAll();
    showStatus?.('Supabase conectado · Base PostgreSQL lista · revisión '+ccRevision,'success');
  }catch(e){
    console.error(e);
    ccRenderAll();
    showStatus?.('No se pudo conectar a Supabase: '+(e.message||e),'error');
  }
}
window.ccInitCloud=ccInitCloud;
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{ccInitCloud();},60));
})();
