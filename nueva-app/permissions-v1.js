(function(){
 let P={hojas:true,anticipos:true,historial:true,documentos:true};
 const sb=()=>window.sb;
 function apply(){
  const map={goHs:'hojas',goAnt:'anticipos',goHist:'historial'};
  Object.entries(map).forEach(([id,k])=>{const b=document.getElementById(id);if(b)b.style.display=P[k]?'':'none';});
 }
 async function load(){
  try{const s=sb();if(!s)return;const r=await s.rpc('app_mobile_permissions');if(r.error||!r.data?.ok)return;P=Object.assign(P,r.data.permisos||{});window.APP_MOBILE_PERMISSIONS=P;apply();}catch(e){console.warn('Permisos app móvil',e)}
 }
 document.addEventListener('click',e=>{const b=e.target.closest?.('#goHs,#goAnt,#goHist');if(!b)return;const k={goHs:'hojas',goAnt:'anticipos',goHist:'historial'}[b.id];if(k&&!P[k]){e.preventDefault();e.stopImmediatePropagation();alert('No tienes permiso para ver este módulo.');}},true);
 setTimeout(load,700);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
})();