/* Tráfico App Profesional - control independiente de versión.
   Solo se ejecuta al cargar/refrescar. Nunca modifica Auth, cc_my_access ni Supabase. */
(function(){
'use strict';
const LOCAL_VERSION='PRO-20260930-12';
window.GM_PROFESSIONAL_VERSION=LOCAL_VERSION;
function overlay(cfg){
  if(document.getElementById('gmVersionGate')) return;
  const d=document.createElement('div'); d.id='gmVersionGate';
  d.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#0f172a;display:flex;align-items:center;justify-content:center;padding:22px;font-family:Arial,sans-serif';
  d.innerHTML='<div style="width:min(460px,100%);background:#fff;border-radius:18px;padding:28px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.35)"><div style="font-size:42px">↻</div><h2 style="margin:8px 0;color:#0f172a">Nueva versión disponible</h2><p style="color:#64748b;line-height:1.5">'+String(cfg.message||'Actualiza Tráfico App para continuar.')+'</p><button id="gmVersionReload" style="margin-top:12px;border:0;border-radius:10px;background:#2563eb;color:#fff;padding:12px 20px;font-weight:900;font-size:14px;cursor:pointer">Actualizar ahora</button><div style="margin-top:12px;font-size:10px;color:#94a3b8">Versión requerida: '+String(cfg.version||'')+'</div></div>';
  document.documentElement.appendChild(d);
  document.getElementById('gmVersionReload').onclick=function(){const u=new URL(location.href);u.searchParams.set('v',cfg.version||Date.now());location.replace(u.toString());};
}
async function check(){
  try{
    const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'});
    if(!r.ok) return;
    const cfg=await r.json();
    if(cfg && cfg.mandatory===true && cfg.version && cfg.version!==LOCAL_VERSION) overlay(cfg);
  }catch(e){ console.warn('Control de versión no disponible; acceso no bloqueado.',e); }
}
check();
})();
