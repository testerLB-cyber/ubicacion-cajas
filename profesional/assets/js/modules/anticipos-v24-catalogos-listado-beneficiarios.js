/* Tráfico App Profesional · Anticipos v24 · Catálogos listado + conceptos Beneficiario */
(function(){
  if(window.__ccAntV24)return; window.__ccAntV24=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const active=a=>(a||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
  const today=()=>new Date().toISOString().slice(0,10);
  function style(){
    if(document.getElementById('ccAntV24Style'))return;
    const s=document.createElement('style');s.id='ccAntV24Style';s.textContent=`
#ccAntCatalogV12{margin-bottom:12px!important}
#ccAntCatalogV12>.cc-config-alert{padding:9px 12px!important;margin-bottom:8px!important;border-radius:8px!important;font-size:11px!important}
#ccAntCatalogV12>.cc-ant-report-grid{display:block!important}
#ccAntCatalogV12>.cc-ant-report-grid>.cc-config-card{margin:0 0 7px!important;padding:0!important;border:1px solid #dbe3ee!important;border-radius:9px!important;overflow:hidden!important;background:#fff!important;box-shadow:none!important}
#ccAntCatalogV12>.cc-ant-report-grid>.cc-config-card>.cc-toolbar{padding:8px 10px!important;margin:0!important;background:#f8fafc!important;border-bottom:1px solid #e2e8f0!important;min-height:42px!important}
#ccAntCatalogV12>.cc-ant-report-grid>.cc-config-card>.cc-toolbar strong{font-size:12px!important;color:#0f172a!important}
#ccAntCatalogV12>.cc-ant-report-grid>.cc-config-card>.cc-toolbar+.cc-ant-v24-list,#ccAntCatalogV12>.cc-ant-report-grid>.cc-config-card>.cc-toolbar+div{max-height:245px!important;overflow:auto!important;padding:0 10px!important}
#ccAntCatalogV12>.cc-ant-report-grid>.cc-config-card>.cc-toolbar+div>div{padding:6px 2px!important;min-height:34px!important;align-items:center!important}
#ccAntCatalogV12 .cc-btn{min-height:27px!important;padding:4px 8px!important;font-size:10px!important;border-radius:6px!important}
#ccAntCatalogV12 .cc-note{font-size:9.5px!important;line-height:1.25!important}
#ccAntCatalogV12>div[style*="margin-top:14px"]{margin-top:10px!important}
#ccAntCatalogV12>div[style*="margin-top:14px"]>.cc-ant-report-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))!important;gap:8px!important}
#ccAntCatalogV12>div[style*="margin-top:14px"] .cc-config-card{padding:9px!important;border-radius:9px!important;box-shadow:none!important}
#ccAntBen24 .cc-ant-ben-row{display:grid;grid-template-columns:minmax(180px,1fr) 150px 36px;gap:8px;align-items:end;padding:8px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc}
#ccAntBen24 .cc-ant-ben-row .cc-field{margin:0!important}
@media(max-width:700px){#ccAntBen24 .cc-ant-ben-row{grid-template-columns:1fr 120px 34px}#ccAntCatalogV12>div[style*="margin-top:14px"]>.cc-ant-report-grid{grid-template-columns:1fr!important}}
`;
    document.head.appendChild(s);
  }
  function organize(){
    style(); const p=document.getElementById('ccAntCatalogV12'); if(!p)return;
    p.querySelectorAll(':scope > .cc-ant-report-grid > .cc-config-card').forEach(card=>{
      const body=card.querySelector(':scope > .cc-toolbar + div'); if(body)body.classList.add('cc-ant-v24-list');
    });
  }
  async function rpc(name,args){if(!sb()||typeof sb().rpc!=='function')throw new Error('Supabase no está disponible.');const r=await sb().rpc(name,args||{});if(r.error)throw r.error;if(r.data?.ok===false)throw new Error(r.data.error||'No se pudo guardar');return r.data}
  function opts(xs,label){return '<option value="">Seleccionar…</option>'+xs.map(x=>'<option value="'+esc(x.id)+'">'+esc(label(x))+'</option>').join('')}
  function shell(){document.getElementById('ccAntBen24')?.remove();const o=document.createElement('div');o.id='ccAntBen24';o.style='position:fixed;inset:0;background:rgba(15,23,42,.82);z-index:2147483200;display:flex;align-items:center;justify-content:center;padding:14px';o.innerHTML='<div style="background:#fff;width:min(980px,98vw);max-height:96vh;overflow:auto;border-radius:18px"><div style="position:sticky;top:0;z-index:2;background:#0f172a;color:#fff;padding:15px 18px;display:flex;justify-content:space-between"><div><strong>Nuevo anticipo · Beneficiario</strong><div style="font-size:10px;color:#cbd5e1">Los conceptos se agregan manualmente desde el catálogo. No se carga ningún concepto por default.</div></div><button data-x style="background:none;border:0;color:#fff;font-size:24px">×</button></div><div data-body style="padding:18px"></div></div>';document.body.appendChild(o);o.querySelector('[data-x]').onclick=()=>o.remove();return o}
  async function openBeneficiary(){
    const o=shell(),body=o.querySelector('[data-body]');
    try{
      const [ra,re]=await Promise.all([sb().rpc('cc_ant_list'),sb().rpc('cc_ant_prof_extra_list')]);
      if(ra.error)throw ra.error;if(re.error)throw re.error;
      const b=ra.data||{},e=re.data||{};
      const accounts=active(e.cuentas||b.cuentas).filter(x=>x.usoCajaChica||x.uso_caja_chica);
      const bens=active(e.beneficiarios||e.responsables);
      const methods=active(b.metodosDeposito);
      const concepts=active(b.conceptos||[]);
      body.innerHTML='<form id="ccBen24Form"><div class="cc-grid"><div class="cc-field"><label>Cuenta *</label><select name="cuentaId" required>'+opts(accounts,x=>x.nombre)+'</select></div><div class="cc-field"><label>Beneficiario *</label><select name="responsableId" required>'+opts(bens,x=>x.nombre)+'</select></div><div class="cc-field"><label>Fecha *</label><input name="fecha" type="date" value="'+today()+'" required></div><div class="cc-field"><label>Método *</label><select name="metodoDepositoId" required>'+opts(methods,x=>x.nombre)+'</select></div><div class="cc-field"><label>Referencia</label><input name="referencia"></div></div><div class="cc-field"><label>Observaciones</label><textarea name="observaciones"></textarea></div><div class="cc-toolbar" style="margin-top:14px"><div><strong>Conceptos del anticipo</strong><div class="cc-note">Agrega únicamente los conceptos necesarios desde el catálogo. No existen conceptos preseleccionados para Beneficiarios.</div></div><button type="button" class="cc-btn cc-btn-light" id="ccBen24Add">+ Agregar concepto</button></div><div id="ccBen24Rows" style="display:grid;gap:7px"></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Crear anticipo</button></div></form>';
      const f=body.querySelector('#ccBen24Form'),box=body.querySelector('#ccBen24Rows');
      body.querySelector('[data-cancel]').onclick=()=>o.remove();
      function addRow(){const used=new Set([...box.querySelectorAll('[data-concept]')].map(x=>x.value).filter(Boolean));const available=concepts.filter(x=>!used.has(x.id));if(!available.length)return alert('No hay más conceptos activos disponibles en el catálogo.');const row=document.createElement('div');row.className='cc-ant-ben-row';row.innerHTML='<div class="cc-field"><label>Concepto *</label><select data-concept required>'+opts(available,x=>x.nombre)+'</select></div><div class="cc-field"><label>Monto *</label><input data-monto type="number" min="0.01" step="0.01" required></div><button type="button" class="cc-btn cc-btn-light" data-rm title="Quitar">×</button>';box.appendChild(row);row.querySelector('[data-rm]').onclick=()=>row.remove()}
      body.querySelector('#ccBen24Add').onclick=addRow;
      f.onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(f),rows=[...box.querySelectorAll('.cc-ant-ben-row')];if(!rows.length)return alert('Agrega al menos un concepto del catálogo.');const det=rows.map(r=>({conceptoId:r.querySelector('[data-concept]').value,monto:Number(r.querySelector('[data-monto]').value||0)})).filter(x=>x.conceptoId&&x.monto>0);if(det.length!==rows.length)return alert('Completa concepto y monto en todos los renglones.');if(new Set(det.map(x=>x.conceptoId)).size!==det.length)return alert('No puedes repetir el mismo concepto.');const total=det.reduce((s,x)=>s+x.monto,0);try{const r=await rpc('cc_ant_create',{p_item:{esCajaChica:true,cuentaId:fd.get('cuentaId'),responsableId:fd.get('responsableId'),metodoDepositoId:fd.get('metodoDepositoId'),fecha:new Date(fd.get('fecha')+'T12:00:00').toISOString(),referencia:fd.get('referencia'),observaciones:fd.get('observaciones'),montoEntregado:total,detalles:det}});o.remove();window.ccAntLoad?.(true);if(typeof window.ccAntPostCreateComun==='function')window.ccAntPostCreateComun(r);else alert('Anticipo creado: '+(r?.folio||''))}catch(err){alert(err.message||err)}};
    }catch(err){body.innerHTML='<div class="cc-config-alert">'+esc(err.message||err)+'</div>'}
  }
  function boot(){style();window.ccAntOpenBeneficiaryForm=openBeneficiary;document.addEventListener('click',e=>{if(e.target.closest('#ccPanelAnticipos [data-antv="catalogos"]'))setTimeout(organize,180)},true);setTimeout(organize,1100);const v=document.getElementById('ccAntViewCatalogos');if(v)new MutationObserver(()=>organize()).observe(v,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
