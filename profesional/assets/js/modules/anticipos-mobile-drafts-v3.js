/* Tráfico App · Anticipos · Borradores móviles v3 */
(function(){
  'use strict';
  if(window.__ANT_MOBILE_DRAFTS_V3__) return;
  window.__ANT_MOBILE_DRAFTS_V3__=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const date=v=>v?new Date(v).toLocaleDateString('es-MX'):'—';
  let SUMMARY=[];
  let busy=false;

  async function rpc(name,args={}){
    const r=await sb()?.rpc(name,args);
    if(!r) throw new Error('Supabase no disponible');
    if(r.error) throw r.error;
    if(r.data?.ok===false) throw new Error(r.data.error||'Operación no disponible');
    return r.data;
  }

  async function refreshSummary(){
    if(!sb()||busy)return;
    busy=true;
    try{const d=await rpc('cc_ant_mobile_pending_summary');SUMMARY=d?.rows||[];paintRows();patchOpenModal();}
    catch(e){console.warn('ANT DRAFTS SUMMARY',e)}finally{busy=false}
  }

  function paintRows(){
    const body=document.getElementById('ccAntBody');if(!body)return;
    const rows=[...body.querySelectorAll('tr')];
    rows.forEach(tr=>{
      tr.querySelector('[data-ant-draft-badge]')?.remove();
      tr.style.removeProperty('background');tr.style.removeProperty('box-shadow');
      const txt=(tr.textContent||'').toUpperCase();
      const s=SUMMARY.find(x=>x.folio&&txt.includes(String(x.folio).toUpperCase()));
      if(!s)return;
      tr.style.setProperty('background','#fef3c7','important');
      tr.style.setProperty('box-shadow','inset 5px 0 0 #f59e0b','important');
      const first=tr.querySelector('td');
      if(first){const b=document.createElement('div');b.dataset.antDraftBadge='1';b.style.cssText='display:inline-flex;align-items:center;gap:5px;margin-top:5px;padding:4px 8px;border-radius:999px;background:#f59e0b;color:#78350f;font-size:10px;font-weight:900';b.innerHTML='📱 '+Number(s.pendientes||0)+' PRECAPTURA'+(Number(s.pendientes||0)===1?'':'S')+' PENDIENTE'+(Number(s.pendientes||0)===1?'':'S');first.appendChild(b)}
    });
  }

  function hideQr(root=document){
    const scope=root||document;
    [...scope.querySelectorAll('button,a,[role="button"]')].forEach(el=>{
      const t=(el.textContent||'').trim();
      if(/\bQR\b|c[oó]digo\s*qr|comprobar\s*por\s*qr/i.test(t)) el.style.display='none';
    });
  }

  async function signed(path){
    if(!path)return null;
    const r=await sb().storage.from('app-anticipos-evidencia').createSignedUrl(path,900);
    if(r.error)throw r.error;return r.data?.signedUrl||null;
  }
  async function showPhoto(path,title){
    try{
      const url=await signed(path);if(!url)throw new Error('La precaptura no tiene foto.');
      document.getElementById('antDraftPhoto')?.remove();
      const o=document.createElement('div');o.id='antDraftPhoto';o.style.cssText='position:fixed;inset:0;z-index:120500;background:rgba(15,23,42,.86);display:flex;align-items:center;justify-content:center;padding:14px';
      o.innerHTML='<div style="width:min(920px,96vw);background:#fff;border-radius:18px;overflow:hidden"><div style="padding:13px 16px;background:#92400e;color:#fff;display:flex;justify-content:space-between"><strong>'+esc(title||'Foto del comprobante')+'</strong><button data-x style="border:0;background:none;color:#fff;font-size:25px">×</button></div><div style="padding:12px;text-align:center;background:#f8fafc"><img src="'+esc(url)+'" style="max-width:100%;max-height:78vh;object-fit:contain;border-radius:10px"></div></div>';
      document.body.appendChild(o);const close=()=>o.remove();o.querySelector('[data-x]').onclick=close;o.onclick=e=>{if(e.target===o)close()};
    }catch(e){alert(e.message||e)}
  }

  async function acceptDraft(p,anticipoId){
    if(!confirm('¿Aceptar esta precaptura por '+money(p.monto)+'? Al aceptar comenzará a contar como comprobación del anticipo.'))return;
    try{await rpc('cc_ant_mobile_accept_precapture',{p_id:p.id});await window.ccAntLoad?.(true);await refreshSummary();setTimeout(()=>patchOpenModal(true),150)}catch(e){alert(e.message||e)}
  }
  async function rejectDraft(p){
    const motivo=prompt('Motivo del rechazo:','Información por corregir');if(motivo===null)return;
    try{await rpc('cc_ant_mobile_reject_precapture',{p_id:p.id,p_motivo:motivo});await window.ccAntLoad?.(true);await refreshSummary();setTimeout(()=>patchOpenModal(true),150)}catch(e){alert(e.message||e)}
  }

  async function patchOpenModal(force=false){
    const modal=document.getElementById('ccProfCompModal');if(!modal||!sb())return;
    hideQr(modal);
    const title=modal.querySelector('strong')?.textContent||'';
    const s=SUMMARY.find(x=>title.includes(x.folio));
    if(!s){modal.querySelector('[data-ant-drafts-v3]')?.remove();return}
    if(modal.querySelector('[data-ant-drafts-v3]')&&!force)return;
    modal.querySelector('[data-ant-drafts-v3]')?.remove();
    try{
      const d=await rpc('cc_ant_mobile_precaptures',{p_anticipo_id:s.anticipoId});
      const drafts=(d?.rows||[]).filter(x=>String(x.estatus||'').toUpperCase()==='PENDIENTE');
      const sec=document.createElement('section');sec.dataset.antDraftsV3='1';sec.style.cssText='margin:0 18px 16px;padding:14px;border:2px solid #f59e0b;background:#fffbeb;border-radius:14px';
      sec.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px"><div><div style="font-size:10px;font-weight:900;color:#92400e">BORRADORES DEL OPERADOR</div><strong style="font-size:14px;color:#78350f">Información precargada desde App Móvil</strong><div style="font-size:10px;color:#92400e;margin-top:3px">Revisa la información y la foto. No afecta saldos hasta presionar Aceptar.</div></div><span style="background:#f59e0b;color:#78350f;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:900">'+drafts.length+' pendiente'+(drafts.length===1?'':'s')+'</span></div>'+
      (drafts.length?'<div style="display:grid;gap:9px">'+drafts.map(p=>'<div data-draft="'+esc(p.id)+'" style="background:#fff;border:1px solid #fde68a;border-radius:12px;padding:11px"><div style="display:grid;grid-template-columns:repeat(5,minmax(90px,1fr));gap:8px;font-size:11px"><div><small style="color:#64748b">FECHA</small><br><b>'+date(p.fecha)+'</b></div><div><small style="color:#64748b">CONCEPTO</small><br><b>'+esc(p.concepto||'—')+'</b></div><div><small style="color:#64748b">TIPO</small><br><b>'+esc(p.tipoDocumento||'—')+'</b></div><div><small style="color:#64748b">FOLIO</small><br><b>'+esc(p.folioDocumento||'—')+'</b></div><div><small style="color:#64748b">MONTO</small><br><b>'+money(p.monto)+'</b></div></div><div style="margin-top:7px;font-size:10px;color:#64748b"><b>Observaciones:</b> '+esc(p.observaciones||'—')+'</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:9px"><button class="cc-btn cc-btn-light" data-photo="'+esc(p.id)+'">📷 Ver foto</button><button class="cc-btn cc-btn-primary" data-accept="'+esc(p.id)+'">✓ Aceptar</button><button class="cc-btn cc-btn-danger" data-reject="'+esc(p.id)+'">Rechazar</button></div></div>').join('')+'</div>':'<div style="padding:10px;color:#64748b">No hay borradores pendientes.</div>');
      const card=modal.firstElementChild;const body=card?.children?.[1]||card;body?.insertAdjacentElement('afterbegin',sec);
      sec.onclick=e=>{const b=e.target.closest('[data-photo],[data-accept],[data-reject]');if(!b)return;const id=b.dataset.photo||b.dataset.accept||b.dataset.reject,p=drafts.find(x=>x.id===id);if(!p)return;if(b.dataset.photo)return showPhoto(p.fotoPath||p.foto_path,'Comprobante · '+(p.concepto||''));if(b.dataset.accept)return acceptDraft(p,s.anticipoId);if(b.dataset.reject)return rejectDraft(p)};
      hideQr(modal);
    }catch(e){console.warn('ANT DRAFTS MODAL',e)}
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('button,a,[role="button"]');if(!b)return;
    if(/comprobar|ver comprobantes/i.test(b.textContent||'')) setTimeout(()=>{refreshSummary();patchOpenModal(true);hideQr(document)},180);
  },true);

  const obs=new MutationObserver(()=>{paintRows();const m=document.getElementById('ccProfCompModal');if(m){hideQr(m);patchOpenModal()}else hideQr(document)});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(refreshSummary,3000);
  setTimeout(refreshSummary,600);
})();