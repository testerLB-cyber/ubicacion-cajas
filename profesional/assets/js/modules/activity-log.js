(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=d=>{try{return new Date(d).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'medium'});}catch(_){return d||'';}};
function sb(){return window.gmSupabase||null;}
function canView(){return window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('logs.ver'));}
async function logActivity(accion,modulo,descripcion,idRegistro,submodulo){
  const c=sb(); if(!c||!window.CC_AUTH_READY)return;
  try{await c.rpc('cc_log_activity',{p_accion:accion||'CONSULTA',p_modulo:modulo||'General',p_descripcion:descripcion||null,p_id_registro:idRegistro||null,p_submodulo:submodulo||null});}catch(e){console.warn('LOG ACTIVIDAD',e);}
}
window.ccLogActivity=logActivity;

function addStyles(){if(document.getElementById('ccActivityLogStyles'))return;const s=document.createElement('style');s.id='ccActivityLogStyles';s.textContent=`
.cc-log-entry{border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;background:#fff}.cc-log-entry+.cc-log-entry{margin-top:7px}.cc-log-meta{display:flex;gap:8px;flex-wrap:wrap;font-size:10px;color:#64748b;margin-top:4px}.cc-log-action{font-weight:900;font-size:10px;padding:3px 7px;border-radius:999px;background:#e0f2fe;color:#075985}.cc-log-modal{position:fixed;inset:0;background:rgba(15,23,42,.58);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px}.cc-log-card{width:min(1180px,98vw);max-height:94vh;overflow:hidden;background:#f8fafc;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.3);display:flex;flex-direction:column}.cc-log-head{padding:15px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between;gap:12px;align-items:center}.cc-log-body{padding:14px;overflow:auto}.cc-log-filters{display:grid;grid-template-columns:repeat(5,minmax(140px,1fr));gap:8px;margin-bottom:12px}.cc-log-filters input,.cc-log-filters select{width:100%;border:1px solid #cbd5e1;border-radius:9px;padding:8px;background:white;font-size:11px}.cc-log-list{max-height:62vh;overflow:auto}.cc-log-empty{padding:28px;text-align:center;color:#64748b;background:white;border:1px dashed #cbd5e1;border-radius:12px}@media(max-width:800px){.cc-log-filters{grid-template-columns:1fr 1fr}.cc-log-card{max-height:96vh}.cc-log-list{max-height:58vh}}
`;document.head.appendChild(s);}

function installConfigCard(){
  if(!canView())return;
  const panel=document.getElementById('ccPanelConfiguracion'); if(!panel||panel.querySelector('[data-cc-activity-card]'))return;
  const card=document.createElement('div');card.setAttribute('data-cc-activity-card','1');card.className='cc-card';card.style.marginTop='14px';
  card.innerHTML='<div class="cc-card-head" style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><h3 style="font-weight:900"><i class="fa-solid fa-clock-rotate-left"></i> Log de actividad</h3><p style="font-size:11px;color:#64748b;margin-top:3px">Consulta quién hizo qué, cuándo y en qué módulo.</p></div><button type="button" class="cc-btn cc-btn-primary" onclick="ccOpenActivityLog()"><i class="fa-solid fa-list-check"></i> Ver movimientos</button></div>';
  panel.appendChild(card);
}

async function loadLogs(){
  const c=sb(); if(!c)return;
  const desde=document.getElementById('ccLogDesde')?.value||null;
  const hastaRaw=document.getElementById('ccLogHasta')?.value||null;
  const hasta=hastaRaw?hastaRaw+'T23:59:59.999':null;
  const uid=document.getElementById('ccLogUsuario')?.value||null;
  const modulo=document.getElementById('ccLogModulo')?.value||null;
  const accion=document.getElementById('ccLogAccion')?.value||null;
  const list=document.getElementById('ccLogList'); if(list)list.innerHTML='<div class="cc-log-empty">Cargando movimientos…</div>';
  const {data,error}=await c.rpc('cc_activity_log_filtered',{p_desde:desde?desde+'T00:00:00':null,p_hasta:hasta,p_usuario_id:uid||null,p_modulo:modulo||null,p_accion:accion||null,p_limit:1000});
  if(error||!data?.ok){if(list)list.innerHTML='<div class="cc-log-empty">No se pudo cargar el log: '+esc(error?.message||data?.error||'Error')+'</div>';return;}
  const uSel=document.getElementById('ccLogUsuario'); if(uSel&&uSel.options.length<=1){(data.usuarios||[]).forEach(u=>{const o=document.createElement('option');o.value=u.userId;o.textContent=u.nombre||u.email||u.userId;uSel.appendChild(o);});}
  const rows=data.logs||[];
  const modules=[...new Set(rows.map(x=>x.modulo).filter(Boolean))].sort(); const mSel=document.getElementById('ccLogModulo'); if(mSel&&mSel.options.length<=1)modules.forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=m;mSel.appendChild(o);});
  if(!list)return; if(!rows.length){list.innerHTML='<div class="cc-log-empty">No hay movimientos con estos filtros.</div>';return;}
  list.innerHTML=rows.map(r=>'<div class="cc-log-entry"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><b>'+esc(r.usuario||'SISTEMA')+'</b><div style="font-size:12px;margin-top:3px">'+esc(r.descripcion||((r.accion||'')+' · '+(r.modulo||'')))+'</div></div><span class="cc-log-action">'+esc(r.accion||'MOVIMIENTO')+'</span></div><div class="cc-log-meta"><span><i class="fa-regular fa-calendar"></i> '+esc(fmt(r.fecha_hora))+'</span><span><i class="fa-solid fa-layer-group"></i> '+esc(r.modulo||'—')+'</span>'+(r.submodulo?'<span>'+esc(r.submodulo)+'</span>':'')+(r.id_registro?'<span>Registro: '+esc(r.id_registro)+'</span>':'')+'</div></div>').join('');
}
window.ccLoadActivityLog=loadLogs;
window.ccOpenActivityLog=async function(){
  if(!canView()){alert('No tienes permiso para consultar el log de actividad.');return;}
  document.getElementById('ccActivityLogModal')?.remove(); addStyles();
  const ov=document.createElement('div');ov.id='ccActivityLogModal';ov.className='cc-log-modal';
  ov.innerHTML='<div class="cc-log-card"><div class="cc-log-head"><div><b style="font-size:15px">Log de actividad</b><div style="font-size:10px;color:#bfdbfe">Altas, bajas, modificaciones, comprobaciones y consultas por usuario</div></div><button class="cc-btn cc-btn-light" onclick="document.getElementById(\'ccActivityLogModal\').remove()">Cerrar</button></div><div class="cc-log-body"><div class="cc-log-filters"><input id="ccLogDesde" type="date" title="Desde"><input id="ccLogHasta" type="date" title="Hasta"><select id="ccLogUsuario"><option value="">Todos los usuarios</option></select><select id="ccLogModulo"><option value="">Todos los módulos</option></select><select id="ccLogAccion"><option value="">Todas las acciones</option><option>ALTA</option><option>MODIFICACION</option><option>BAJA</option><option>CONSULTA</option><option>COMPROBACION</option></select></div><div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="cc-btn cc-btn-primary" onclick="ccLoadActivityLog()"><i class="fa-solid fa-filter"></i> Aplicar filtros</button></div><div id="ccLogList" class="cc-log-list"></div></div></div>';
  document.body.appendChild(ov); await logActivity('CONSULTA','Configuración','Consultó el Log de actividad'); await loadLogs();
};

function installConsultationTracking(){
  if(window.__ccConsultationTracking)return;window.__ccConsultationTracking=true;
  document.addEventListener('click',e=>{
    const tab=e.target.closest('#controlCajasSection .cc-tab'); if(tab){const txt=(tab.textContent||'').trim(); if(txt)logActivity('CONSULTA',txt,'Abrió el módulo '+txt);}
    const side=e.target.closest('#gmSideDashboard,#gmSideCajas'); if(side){const txt=(side.textContent||'').trim(); if(txt)logActivity('CONSULTA',txt,'Abrió '+txt);}
  },true);
}
function boot(){addStyles();installConsultationTracking();installConfigCard();const mo=new MutationObserver(()=>installConfigCard());mo.observe(document.documentElement,{childList:true,subtree:true});setInterval(installConfigCard,2500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
