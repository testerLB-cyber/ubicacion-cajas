/* Tráfico App · Anticipos · Utilería de anticipos históricos en circulación v1 */
(function(){
  'use strict';
  if(window.__CC_ANT_UTIL_HIST_V1__)return;
  window.__CC_ANT_UTIL_HIST_V1__=true;

  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const canUse=()=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('anticipos.catalogos'));
  let catalogs=null;

  async function loadCatalogs(){
    const c=sb(); if(!c) throw new Error('Supabase no está disponible.');
    const r=await c.rpc('cc_ant_list'); if(r.error) throw r.error;
    catalogs=r.data||{}; return catalogs;
  }
  async function loadHistoric(){
    const r=await sb().rpc('cc_ant_util_list'); if(r.error) throw r.error;
    return Array.isArray(r.data?.registros)?r.data.registros:[];
  }

  function ensureButton(){
    if(!canUse())return;
    if(document.getElementById('ccAntUtilBtn'))return;
    const nuevo=document.getElementById('ccAntNuevoBtn');
    const panel=document.getElementById('ccPanelAnticipos')||document.querySelector('[id*="Anticipos"]');
    if(!nuevo&&!panel)return;
    const b=document.createElement('button');
    b.type='button'; b.id='ccAntUtilBtn'; b.className='cc-btn cc-btn-light';
    b.style='font-weight:900;border:1px solid #f59e0b;background:#fffbeb;color:#92400e';
    b.innerHTML='<i class="fa-solid fa-screwdriver-wrench mr-1"></i> Utilería';
    b.onclick=openModal;
    if(nuevo?.parentElement) nuevo.parentElement.insertBefore(b,nuevo.nextSibling); else panel.prepend(b);
  }

  function rowHtml(x){
    return `<tr><td><strong>${esc(x.folio||'—')}</strong></td><td>${esc(String(x.fecha||'').slice(0,10)||'—')}</td><td>${esc(x.beneficiario||'—')}</td><td>${money(x.monto)}</td><td>${money(x.comprobado)}</td><td><strong>${money(x.pendiente)}</strong></td><td>${esc(x.estatus||'—')}</td><td><button type="button" class="cc-btn cc-btn-light" data-util-comprobar="${esc(x.beneficiarioId||'')}">Ver en anticipos</button></td></tr>`;
  }

  async function openModal(){
    if(!canUse())return alert('Sin permiso para usar utilerías de Anticipos.');
    document.getElementById('ccAntUtilModal')?.remove();
    const ov=document.createElement('div'); ov.id='ccAntUtilModal';
    ov.style='position:fixed;inset:0;background:rgba(15,23,42,.76);z-index:101000;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML=`<div style="background:#fff;width:min(1050px,98vw);max-height:95vh;overflow:auto;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.35)">
      <div style="background:#0f172a;color:#fff;padding:15px 18px;display:flex;justify-content:space-between;align-items:center"><div><strong><i class="fa-solid fa-screwdriver-wrench mr-1"></i> Utilería · Anticipos en circulación</strong><div style="font-size:10px;color:#cbd5e1;margin-top:3px">Carga saldos pendientes anteriores al sistema sin volver a descontar dinero de caja.</div></div><button type="button" data-x style="border:0;background:none;color:#fff;font-size:22px">×</button></div>
      <div style="padding:18px">
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px;margin-bottom:14px;font-size:11px;color:#78350f"><strong>Cómo usarlo:</strong> captura solamente el <b>saldo que hoy sigue pendiente por comprobar</b> del operador. El registro se marca como histórico, <b>no afecta el saldo de la cuenta/caja</b>, y después se comprueba y se cierra con el flujo normal de Anticipos.</div>
        <form id="ccAntUtilForm">
          <div class="cc-grid">
            <div class="cc-field"><label>Operador *</label><select name="operadorId" required><option value="">Cargando…</option></select></div>
            <div class="cc-field"><label>Cuenta de referencia *</label><select name="cuentaId" required><option value="">Cargando…</option></select></div>
            <div class="cc-field"><label>Fecha original *</label><input name="fecha" type="date" required></div>
            <div class="cc-field"><label>Saldo pendiente actual *</label><input name="monto" type="number" min="0.01" step="0.01" required placeholder="0.00"></div>
            <div class="cc-field"><label>Referencia / folio anterior</label><input name="referencia" placeholder="Cheque, transferencia, folio manual…"></div>
            <div class="cc-field"><label>Viaje / motivo</label><input name="viaje" placeholder="Viaje o motivo del anticipo"></div>
            <div class="cc-field"><label>Destino</label><select name="destinoId"><option value="">Sin destino</option></select></div>
            <div class="cc-field"><label>Unidad</label><select name="unidadId"><option value="">Sin unidad</option></select></div>
            <div class="cc-field"><label>Método de depósito</label><select name="metodoDepositoId"><option value="">No especificado</option></select></div>
            <div class="cc-field" style="grid-column:1/-1"><label>Observaciones</label><textarea name="observaciones" rows="2" placeholder="Ej. Anticipo entregado antes de iniciar el sistema. Se carga solo saldo pendiente."></textarea></div>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary"><i class="fa-solid fa-file-circle-plus mr-1"></i> Registrar saldo histórico</button></div>
        </form>
        <div style="margin-top:22px;border-top:1px solid #e2e8f0;padding-top:16px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><strong>Anticipos históricos cargados</strong><span id="ccAntUtilCount" style="font-size:10px;color:#64748b"></span></div><div class="cc-inv-wrap"><table class="cc-table-list"><thead><tr><th>Folio</th><th>Fecha</th><th>Operador</th><th>Cargado</th><th>Comprobado</th><th>Pendiente</th><th>Estatus</th><th></th></tr></thead><tbody id="ccAntUtilBody"><tr><td colspan="8" style="padding:20px;text-align:center">Cargando…</td></tr></tbody></table></div></div>
      </div></div>`;
    document.body.appendChild(ov);
    const close=()=>ov.remove(); ov.querySelector('[data-x]').onclick=close; ov.querySelector('[data-cancel]').onclick=close;
    try{
      const [d,hist]=await Promise.all([loadCatalogs(),loadHistoric()]);
      const form=ov.querySelector('#ccAntUtilForm');
      form.operadorId.innerHTML='<option value="">Selecciona operador</option>'+(d.operadores||[]).filter(x=>x.estatus==='ACTIVO').map(x=>`<option value="${esc(x.id)}">${esc(x.nombre)}</option>`).join('');
      form.cuentaId.innerHTML='<option value="">Selecciona cuenta</option>'+(d.cuentas||[]).filter(x=>x.estatus==='ACTIVO').map(x=>`<option value="${esc(x.id)}">${esc(x.nombre)}</option>`).join('');
      form.destinoId.innerHTML='<option value="">Sin destino</option>'+(d.destinos||[]).filter(x=>x.estatus==='ACTIVO').map(x=>`<option value="${esc(x.id)}">${esc(x.nombre)}</option>`).join('');
      form.unidadId.innerHTML='<option value="">Sin unidad</option>'+(d.unidadesCarro||[]).map(x=>`<option value="${esc(x.id)}">${esc(x.numero)}${x.descripcion?' · '+esc(x.descripcion):''}</option>`).join('');
      form.metodoDepositoId.innerHTML='<option value="">No especificado</option>'+(d.metodosDeposito||[]).filter(x=>x.estatus==='ACTIVO').map(x=>`<option value="${esc(x.id)}">${esc(x.nombre)}</option>`).join('');
      form.fecha.value=new Date().toISOString().slice(0,10);
      renderHist(hist,ov);
      form.onsubmit=async e=>{e.preventDefault();const btn=form.querySelector('[type=submit]');btn.disabled=true;try{const f=new FormData(form);const item={modo:'ANTICIPO_ABIERTO',tipoBeneficiario:'OPERADOR',operadorId:f.get('operadorId'),cuentaId:f.get('cuentaId'),fecha:f.get('fecha'),monto:Number(f.get('monto')||0),referencia:String(f.get('referencia')||'').trim(),viaje:String(f.get('viaje')||'').trim(),destinoId:f.get('destinoId')||'',unidadId:f.get('unidadId')||'',metodoDepositoId:f.get('metodoDepositoId')||'',observaciones:String(f.get('observaciones')||'').trim()};const r=await sb().rpc('cc_ant_util_import',{p_item:item});if(r.error)throw r.error;if(r.data?.ok===false)throw new Error(r.data.error||'No se pudo registrar');alert('Saldo histórico registrado. Ya puede comprobarse desde el listado normal de Anticipos.');form.reset();form.fecha.value=new Date().toISOString().slice(0,10);renderHist(await loadHistoric(),ov);await window.ccAntLoad?.(true);}catch(err){alert(err.message||err);}finally{btn.disabled=false;}};
    }catch(err){ov.querySelector('#ccAntUtilBody').innerHTML=`<tr><td colspan="8" style="padding:20px;color:#b91c1c">${esc(err.message||err)}</td></tr>`;}
  }

  function renderHist(rows,ov){
    const body=ov.querySelector('#ccAntUtilBody'); if(!body)return;
    ov.querySelector('#ccAntUtilCount').textContent=rows.length+' registro'+(rows.length===1?'':'s');
    body.innerHTML=rows.length?rows.map(rowHtml).join(''):'<tr><td colspan="8" style="padding:22px;text-align:center;color:#94a3b8">Aún no hay anticipos históricos cargados.</td></tr>';
    body.querySelectorAll('[data-util-comprobar]').forEach(b=>b.onclick=async()=>{const operadorId=b.dataset.utilComprobar;ov.remove();await window.ccAntLoad?.(true);setTimeout(()=>{const f=document.getElementById('ccAntOperadorFiltro');if(f&&operadorId){f.value=operadorId;window.ccAntRender?.();}document.getElementById('ccAntBody')?.scrollIntoView({behavior:'smooth',block:'start'});},100);});
  }

  function boot(){
    const t=setInterval(()=>{ensureButton();if(document.getElementById('ccAntNuevoBtn'))clearInterval(t);},500);
    setTimeout(ensureButton,800);
    const old=window.ccAntRender;
    if(typeof old==='function'&&!old.__utilHist){const wrap=function(){const r=old.apply(this,arguments);setTimeout(ensureButton,20);return r};wrap.__utilHist=true;window.ccAntRender=wrap;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();