/* Tráfico App Profesional · Anticipos v25 · Formulario único Movimientos de cajas */
(function(){
  if(window.__ccAntCajaMoveV25)return; window.__ccAntCajaMoveV25=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const canCaja=()=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('anticipos.caja'));
  async function rpc(n,a){if(!sb()||typeof sb().rpc!=='function')throw new Error('Supabase no está disponible.');const r=await sb().rpc(n,a||{});if(r.error)throw r.error;if(r.data?.ok===false)throw new Error(r.data.error||'Operación no disponible');return r.data}
  function opts(xs){return '<option value="">Seleccionar…</option>'+xs.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')}
  async function getAccounts(){const r=await rpc('cc_ant_list');return (r.cuentas||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO')}
  function hideLegacy(view){view.querySelectorAll('[data-v19-role="operational"]').forEach(x=>x.style.display='none')}
  async function render(){
    const view=document.getElementById('ccAntViewCajas'); if(!view||view.style.display==='none')return;
    hideLegacy(view);
    let host=document.getElementById('ccV25MovimientoUnico');
    if(!host){host=document.createElement('div');host.id='ccV25MovimientoUnico';host.className='cc-v16-card';host.style.cssText='display:none;margin-top:12px;grid-column:1/-1';const hist=[...view.querySelectorAll('.cc-v16-card')].find(x=>(x.textContent||'').toLowerCase().includes('historial de movimientos de cajas'));(hist||view).insertAdjacentElement(hist?'beforebegin':'beforeend',host)}
    const btn=view.querySelector('#ccV19MovimientosBtn');
    if(btn&&!btn.dataset.v25){btn.dataset.v25='1';btn.onclick=async()=>{const open=host.style.display!=='none';host.style.display=open?'none':'';btn.setAttribute('aria-expanded',open?'false':'true');btn.innerHTML=open?'<i class="fa-solid fa-right-left"></i> Movimientos de cajas':'<i class="fa-solid fa-xmark"></i> Cerrar movimientos de cajas';if(!open){await paint(host);host.scrollIntoView({behavior:'smooth',block:'nearest'})}}}
  }
  async function paint(host){
    if(!canCaja()){host.innerHTML='<div class="cc-note">No tienes permiso para registrar movimientos de cajas.</div>';return}
    let qs=[];try{qs=await getAccounts()}catch(e){host.innerHTML='<div class="cc-config-alert">'+esc(e.message||e)+'</div>';return}
    host.innerHTML='<div class="cc-toolbar"><div><strong>Movimiento de caja</strong><div class="cc-note">Selecciona el tipo de movimiento. Solo se muestran los campos necesarios.</div></div></div><form id="ccV25MoveForm"><div class="cc-grid"><div class="cc-field"><label>Tipo de movimiento *</label><select name="tipoMovimiento" required><option value="">Seleccionar…</option><option value="TRASPASO">Traspaso entre cuentas</option><option value="ENTRADA">Entrada manual</option><option value="SALIDA">Salida manual</option></select></div><div class="cc-field" data-origen style="display:none"><label>Cuenta origen *</label><select name="origen">'+opts(qs)+'</select></div><div class="cc-field" data-destino style="display:none"><label>Cuenta destino *</label><select name="destino">'+opts(qs)+'</select></div><div class="cc-field" data-cuenta style="display:none"><label>Cuenta *</label><select name="cuenta">'+opts(qs)+'</select></div><div class="cc-field" data-monto style="display:none"><label>Monto *</label><input name="monto" type="number" min="0.01" step="0.01"></div><div class="cc-field" data-ref style="display:none"><label>Referencia</label><input name="ref"></div></div><div class="cc-field" data-obs style="display:none"><label>Observaciones</label><textarea name="obs"></textarea></div><div data-submit style="display:none;text-align:right;margin-top:10px"><button class="cc-btn cc-btn-primary" type="submit"><i class="fa-solid fa-floppy-disk"></i> Registrar movimiento</button></div></form>';
    const f=host.querySelector('#ccV25MoveForm'),type=f.tipoMovimiento;
    function show(){const t=type.value;const tr=t==='TRASPASO',manual=t==='ENTRADA'||t==='SALIDA';f.querySelector('[data-origen]').style.display=tr?'':'none';f.querySelector('[data-destino]').style.display=tr?'':'none';f.querySelector('[data-cuenta]').style.display=manual?'':'none';['[data-monto]','[data-ref]','[data-obs]','[data-submit]'].forEach(s=>f.querySelector(s).style.display=t?'':'none');f.origen.required=tr;f.destino.required=tr;f.cuenta.required=manual;f.monto.required=!!t}
    type.onchange=show;show();
    f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f),t=fd.get('tipoMovimiento'),m=Number(fd.get('monto')||0);if(m<=0)return alert('Captura un monto mayor a cero.');try{const submit=f.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent='Guardando…';if(t==='TRASPASO'){if(fd.get('origen')===fd.get('destino'))throw new Error('La cuenta origen y destino deben ser diferentes.');await rpc('cc_ant_transfer_funds',{p_item:{cuentaOrigenId:fd.get('origen'),cuentaDestinoId:fd.get('destino'),monto:m,referencia:fd.get('ref'),observaciones:fd.get('obs')}})}else if(t==='ENTRADA'||t==='SALIDA'){await rpc('cc_ant_add_cash_movement',{p_item:{cuentaId:fd.get('cuenta'),tipo:t==='ENTRADA'?'DEPOSITO':'AJUSTE_SALIDA',monto:m,referencia:fd.get('ref'),observaciones:fd.get('obs')}})}else throw new Error('Selecciona el tipo de movimiento.');alert('Movimiento registrado correctamente.');host.style.display='none';const btn=document.getElementById('ccV19MovimientosBtn');if(btn){btn.setAttribute('aria-expanded','false');btn.innerHTML='<i class="fa-solid fa-right-left"></i> Movimientos de cajas'};document.getElementById('ccV16Refresh')?.click();window.ccAntLoad?.(true)}catch(err){alert(err.message||err);const submit=f.querySelector('button[type="submit"]');submit.disabled=false;submit.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Registrar movimiento'}}
  }
  function boot(){const root=document.getElementById('ccPanelAnticipos')||document.body;let q=false;const run=()=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;render()})};new MutationObserver(run).observe(root,{childList:true,subtree:true});document.addEventListener('click',e=>{if(e.target.closest?.('.cc-ant-nav [data-antv="cajas"]'))setTimeout(run,80)},true);setTimeout(run,500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1300));else setTimeout(boot,1300);
})();

/* Loader Anticipos v28 */
(function(){
  if(window.__ccAntV28Loader)return;window.__ccAntV28Loader=true;
  const st=document.createElement('style');st.textContent='#ccAntTipoPersonaSwitch{display:none!important}';document.head.appendChild(st);
  const s=document.createElement('script');s.src='assets/js/modules/anticipos-v28-operadores-beneficiarios.js?v=28';document.head.appendChild(s);
})();
