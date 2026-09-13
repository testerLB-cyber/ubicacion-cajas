/* Tráfico App Profesional · Anticipos · precapturas desde App Móvil */
(function(){
  'use strict';
  if(window.__ANT_MOBILE_PRECAPTURE_V1__) return;
  window.__ANT_MOBILE_PRECAPTURE_V1__=true;
  const sb=()=>window.gmSupabase;
  const text=v=>String(v??'').trim();
  const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const date=v=>v?new Date(v).toLocaleDateString('es-MX'):'—';
  async function rpc(name,args={}){const r=await sb().rpc(name,args);if(r.error)throw r.error;if(r.data?.ok===false)throw new Error(r.data.error||'Operación no disponible.');return r.data;}
  async function signed(path){const r=await sb().storage.from('app-anticipos-evidencia').createSignedUrl(path,900);if(r.error||!r.data?.signedUrl)throw new Error(r.error?.message||'No se pudo abrir la evidencia.');return r.data.signedUrl;}
  function photoModal(url,title){document.getElementById('ant-mobile-photo-modal')?.remove();const o=document.createElement('div');o.id='ant-mobile-photo-modal';o.style.cssText='position:fixed;inset:0;z-index:101200;background:rgba(15,23,42,.84);display:flex;align-items:center;justify-content:center;padding:16px';o.innerHTML='<div style="width:min(900px,97vw);background:#fff;border-radius:16px;overflow:hidden"><div style="padding:12px 15px;background:#4c1d95;color:#fff;display:flex;justify-content:space-between"><strong>'+esc(title||'Evidencia')+'</strong><button data-x style="border:0;background:none;color:#fff;font-size:25px">×</button></div><div style="padding:12px;background:#f8fafc;text-align:center;max-height:82vh;overflow:auto"><img src="'+esc(url)+'" style="max-width:100%;max-height:78vh;object-fit:contain;border-radius:10px"></div></div>';document.body.appendChild(o);const x=()=>o.remove();o.querySelector('[data-x]').onclick=x;o.onclick=e=>{if(e.target===o)x()};}
  async function showPhoto(path,title){try{photoModal(await signed(path),title);}catch(e){alert(e.message||e)}}
  function opts(xs,selected=''){return '<option value="">Seleccionar…</option>'+(xs||[]).map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(selected)?'selected':'')+'>'+esc(x.nombre)+'</option>').join('')}
  async function editPre(p,all,done){
    document.getElementById('ant-mobile-edit-modal')?.remove();const o=document.createElement('div');o.id='ant-mobile-edit-modal';o.style.cssText='position:fixed;inset:0;z-index:101210;background:rgba(15,23,42,.78);display:flex;align-items:center;justify-content:center;padding:16px';
    o.innerHTML='<div style="width:min(650px,96vw);background:#fff;border-radius:16px;overflow:hidden"><div style="padding:14px 17px;background:#4c1d95;color:#fff;display:flex;justify-content:space-between"><strong>Revisar precaptura móvil</strong><button data-x style="border:0;background:none;color:#fff;font-size:24px">×</button></div><form style="padding:18px"><div class="cc-grid"><div class="cc-field"><label>Fecha *</label><input name="fecha" type="date" required value="'+esc(String(p.fecha||'').slice(0,10))+'"></div><div class="cc-field"><label>Concepto *</label><select name="conceptoId" required>'+opts(all.conceptos,p.conceptoId)+'</select></div><div class="cc-field"><label>Tipo comprobante *</label><select name="tipoComprobanteId" required>'+opts(all.tiposComprobante,p.tipoComprobanteId)+'</select></div><div class="cc-field"><label>Folio documento</label><input name="folioDocumento" value="'+esc(p.folioDocumento||'')+'"></div><div class="cc-field"><label>Monto *</label><input name="monto" type="number" min="0.01" step="0.01" required value="'+Number(p.monto||0)+'"></div></div><div class="cc-field"><label>Observaciones</label><textarea name="observaciones">'+esc(p.observaciones||'')+'</textarea></div><div style="display:flex;gap:8px;justify-content:space-between;margin-top:12px"><button type="button" class="cc-btn cc-btn-light" data-photo><i class="fa-solid fa-camera"></i> Ver foto</button><div><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button> <button type="submit" class="cc-btn cc-btn-primary">Guardar cambios</button></div></div></form></div>';
    document.body.appendChild(o);const close=()=>o.remove();o.querySelector('[data-x]').onclick=close;o.querySelector('[data-cancel]').onclick=close;o.querySelector('[data-photo]').onclick=()=>showPhoto(p.fotoPath,'Evidencia móvil');
    o.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('[type=submit]');b.disabled=true;try{await rpc('cc_ant_mobile_update_precapture',{p_item:{id:p.id,fecha:new Date(f.fecha.value+'T12:00:00').toISOString(),conceptoId:f.conceptoId.value,tipoComprobanteId:f.tipoComprobanteId.value,folioDocumento:text(f.folioDocumento.value),monto:Number(f.monto.value),observaciones:text(f.observaciones.value)}});close();await done();}catch(err){alert(err.message||err);b.disabled=false}};
  }
  async function enhanceModal(anticipoId){
    const modal=document.getElementById('ccProfCompModal');if(!modal||!sb())return;
    try{
      const [pre,all]=await Promise.all([rpc('cc_ant_mobile_precaptures',{p_anticipo_id:anticipoId}),rpc('cc_ant_list')]);
      modal.querySelector('[data-ant-mobile-section]')?.remove();
      const rows=pre.rows||[],pending=rows.filter(x=>x.estatus==='PENDIENTE').length;
      const sec=document.createElement('div');sec.dataset.antMobileSection='1';sec.style.cssText='margin:0 18px 18px;padding:14px;border:1px solid #ddd6fe;background:#faf5ff;border-radius:12px';
      sec.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px"><div><strong>Precargas desde App Móvil</strong><div style="font-size:10px;color:#6b21a8">El operador puede cargar varios comprobantes. Solo cuentan al ser aceptados aquí.</div></div><span style="padding:5px 8px;border-radius:999px;background:'+(pending?'#fef3c7':'#dcfce7')+';color:'+(pending?'#92400e':'#166534')+';font-size:10px;font-weight:900">'+pending+' pendiente(s)</span></div>'+
        (rows.length?'<div class="cc-inv-wrap" style="max-height:330px;overflow:auto"><table class="cc-ant-table"><thead><tr><th>FECHA</th><th>CONCEPTO</th><th>TIPO</th><th>FOLIO</th><th>MONTO</th><th>ESTATUS</th><th>ACCIONES</th></tr></thead><tbody>'+rows.map(p=>'<tr data-pre="'+esc(p.id)+'"><td>'+date(p.fecha)+'</td><td>'+esc(p.concepto)+'</td><td>'+esc(p.tipoDocumento)+'</td><td>'+esc(p.folioDocumento||'—')+'</td><td><strong>'+money(p.monto)+'</strong></td><td><span class="hs104-pill">'+esc(p.estatus)+'</span></td><td><div style="display:flex;gap:5px;flex-wrap:wrap"><button class="cc-btn cc-btn-light" data-photo="'+esc(p.id)+'"><i class="fa-solid fa-camera"></i> Foto</button>'+(p.estatus==='PENDIENTE'?'<button class="cc-btn cc-btn-light" data-edit="'+esc(p.id)+'">Editar</button><button class="cc-btn cc-btn-primary" data-accept="'+esc(p.id)+'">Aceptar</button><button class="cc-btn cc-btn-danger" data-reject="'+esc(p.id)+'">Rechazar</button>':'')+'</div></td></tr>').join('')+'</tbody></table></div>':'<div style="padding:18px;text-align:center;color:#64748b">Sin precapturas móviles para este anticipo.</div>');
      const inner=modal.querySelector('div > div[style*="padding:18px"]')||modal.querySelector('div');inner?.insertAdjacentElement('afterbegin',sec);
      const refresh=async()=>{await window.ccAntLoad?.(true);setTimeout(()=>{window.ccProfVerComprobantes?.(anticipoId)},100)};
      sec.onclick=async e=>{
        const id=e.target.closest('[data-photo],[data-edit],[data-accept],[data-reject]')?.dataset.photo||e.target.closest('[data-edit]')?.dataset.edit||e.target.closest('[data-accept]')?.dataset.accept||e.target.closest('[data-reject]')?.dataset.reject;if(!id)return;
        const p=rows.find(x=>x.id===id);if(!p)return;
        if(e.target.closest('[data-photo]'))return showPhoto(p.fotoPath,'Comprobante · '+(p.concepto||''));
        if(e.target.closest('[data-edit]'))return editPre(p,all,refresh);
        if(e.target.closest('[data-accept]')){if(!confirm('¿Aceptar este comprobante por '+money(p.monto)+'? Al aceptar comenzará a contar en el saldo del anticipo.'))return;try{await rpc('cc_ant_mobile_accept_precapture',{p_id:p.id});await refresh();}catch(err){alert(err.message||err)}return;}
        if(e.target.closest('[data-reject]')){const motivo=prompt('Motivo del rechazo:','Información por corregir');if(motivo===null)return;try{await rpc('cc_ant_mobile_reject_precapture',{p_id:p.id,p_motivo:motivo});await refresh();}catch(err){alert(err.message||err)}}
      };
      // Evidencias ya aceptadas desde app móvil: convertir ruta privada a visor firmado.
      const accepted=(all.comprobaciones||[]).filter(x=>x.anticipo_id===anticipoId&&String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
      const normalRows=[...modal.querySelectorAll('table tbody tr')].filter(tr=>!tr.closest('[data-ant-mobile-section]'));
      normalRows.forEach((tr,i)=>{const c=accepted[i],a=tr.querySelector('a[href]');if(!c||!a||c.origen!=='APP_MOVIL'||!c.evidencia_url||/^https?:/i.test(c.evidencia_url))return;a.removeAttribute('href');a.onclick=ev=>{ev.preventDefault();showPhoto(c.evidencia_url,'Evidencia aceptada')};});
    }catch(e){console.warn('ANT MOBILE PRECAPTURE',e);}
  }
  function install(){
    if(typeof window.ccProfVerComprobantes!=='function'||window.ccProfVerComprobantes.__mobilePrecapture)return false;
    const original=window.ccProfVerComprobantes;
    const wrapped=async function(id){const r=await original.apply(this,arguments);setTimeout(()=>enhanceModal(id),180);return r;};wrapped.__mobilePrecapture=true;window.ccProfVerComprobantes=wrapped;return true;
  }
  setInterval(()=>{install();const m=document.getElementById('ccProfCompModal');if(m&&!m.querySelector('[data-ant-mobile-section]')){const title=m.querySelector('strong')?.textContent||'',folio=title.split('·').pop()?.trim();if(folio)rpc('cc_ant_list').then(d=>{const a=(d.anticipos||[]).find(x=>text(x.folio)===folio);if(a)enhanceModal(a.id)}).catch(()=>{})}},1200);
})();