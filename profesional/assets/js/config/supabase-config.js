/* SUPABASE 100% NATIVO — CONTROL DE CAJAS
   Proyecto y clave publishable configurados.
   Base normalizada: unidades, clientes, responsables, rentas, control diario,
   tipos de unidad, tarifas, mantenimiento, configuración y auditoría.
   NUNCA colocar service_role en este HTML. */
window.GM_SUPABASE_URL = window.GM_SUPABASE_URL || 'https://nbogdhriavzqetnlrrau.supabase.co';
window.GM_SUPABASE_ANON_KEY = window.GM_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ib2dkaHJpYXZ6cWV0bmxycmF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MDYwMjMsImV4cCI6MjEwNDM4MjAyM30.plW4S1_44rcJXe0-PIwvl5E_SD5nXX83nwJONYRnZPk';

/* Control de versión totalmente independiente de Supabase/Auth.
   Si este script o version.json fallan, la app sigue funcionando. */
(function(){
  try{
    if(document.querySelector('script[data-gm-version-check]')) return;
    var s=document.createElement('script');
    s.src='assets/js/core/version-check.js?v=PRO-20260930-12';
    s.async=true;
    s.setAttribute('data-gm-version-check','1');
    document.head.appendChild(s);
  }catch(e){ console.warn('No se pudo iniciar control de versión',e); }
})();
