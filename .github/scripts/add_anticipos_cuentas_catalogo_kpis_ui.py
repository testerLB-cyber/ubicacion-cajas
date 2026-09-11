from pathlib import Path

P=Path('profesional/assets/js/modules/anticipos-profesional-flow.js')
if not P.exists():
    raise SystemExit('No existe anticipos-profesional-flow.js')

extra=r'''

/* Tráfico App Profesional · Cuenta única en Catálogos + KPIs por cuenta */
(function(){
  if(window.__ccAntCuentaCatalogoKpisV1)return;
  window.__ccAntCuentaCatalogoKpisV1=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  let cache={base:null,extra:null}, selected='';
  const active=xs=>(xs||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');

  async function load(){
    const [a,b]=await Promise.all([sb().rpc('cc_ant_list'),sb().rpc('cc_ant_prof_extra_list')]);
    if(a.error)throw a.error;if(b.error)throw b.error;
    cache={base:a.data||{},extra:b.data||{}};return cache;
  }

  function cleanNav(){
    ['caja','cajachica','cajaspro','traspasos','catalogospro'].forEach(id=>document.querySelector('.cc-ant-nav [data-antv="'+id+'"]')?.remove());
    ['ccAntViewCaja','ccAntViewCajachica','ccAntViewCajaspro','ccAntViewTraspasos','ccAntViewCatalogospro'].forEach(id=>{const x=document.getElementById(id);if(x)x.style.display='none'});
  }

  function saldoCuenta(q){return Number(q?.saldo||0)}
  function renderFilter(){
    const k=document.getElementById('ccAntKpis');if(!k)return;
    let box=document.getElementById('ccAntCuentaKpiFilter');
    if(!box){box=document.createElement('div');box.id='ccAntCuentaKpiFilter';box.style='display:flex;align-items:end;gap:10px;flex-wrap:wrap;margin:0 0 10px 0;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px';k.parentNode.insertBefore(box,k)}
    const qs=active(cache.extra?.cuentas||[]);
    box.innerHTML='<div class="cc-field" style="min-width:260px;margin:0"><label>Indicadores por cuenta</label><select id="ccAntCuentaKpiSel"><option value="">Todas las cuentas</option>'+qs.map(q=>'<option value="'+esc(q.id)+'" '+(q.id===selected?'selected':'')+'>'+esc(q.nombre)+'</option>').join('')+'</select></div><div class="cc-note" style="padding-bottom:7px">Los indicadores superiores cambian según la cuenta seleccionada.</div>';
    box.querySelector('#ccAntCuentaKpiSel').onchange=e=>{selected=e.target.value||'';renderKpis()};
  }

  function renderKpis(){
    const k=document.getElementById('ccAntKpis');if(!k)return;
    const all=cache.base?.anticipos||[], rows=selected?all.filter(a=>a.cuentaId===selected):all;
    const open=rows.filter(a=>!['CANCELADO','CERRADO'].includes(String(a.estatus||'').toUpperCase()));
    const pending=open.reduce((s,a)=>s+Number(a.pendiente||0),0);
    const confirm=open.filter(a=>String(a.estatus||'').toUpperCase()==='PENDIENTE_CONFIRMAR').length;
    const people=new Set(open.filter(a=>Number(a.pendiente||0)>0).map(a=>a.operadorId||a.responsableId||a.id)).size;
    const late=open.filter(a=>Number(a.pendiente||0)>0&&a.fecha&&(Date.now()-new Date(a.fecha).getTime())/86400000>7).length;
    const qs=active(cache.extra?.cuentas||[]), balance=selected?saldoCuenta(qs.find(q=>q.id===selected)):qs.reduce((s,q)=>s+saldoCuenta(q),0);
    k.innerHTML='<div class="cc-ant-kpi"><small>Saldo '+(selected?'de cuenta':'total cuentas')+'</small><strong>'+money(balance)+'</strong></div><div class="cc-ant-kpi"><small>Pendientes confirmar</small><strong>'+confirm+'</strong></div><div class="cc-ant-kpi"><small>Total por comprobar</small><strong>'+money(pending)+'</strong></div><div class="cc-ant-kpi"><small>Personas con pendiente</small><strong>'+people+'</strong></div><div class="cc-ant-kpi"><small>+7 días</small><strong>'+late+'</strong></div>';
  }

  function modal(title,html,onSubmit){
    const ov=document.createElement('div');ov.style='position:fixed;inset:0;background:rgba(15,23,42,.76);z-index:100080;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML='<div style="background:#fff;width:min(700px,97vw);max-height:94vh;overflow:auto;border-radius:16px"><div style="background:#0f172a;color:#fff;padding:15px 18px;display:flex;justify-content:space-between"><strong>'+esc(title)+'</strong><button data-x style="border:0;background:none;color:#fff;font-size:22px">×</button></div><form style="padding:18px">'+html+'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar</button></div></form></div>';
    document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-x]').onclick=close;ov.querySelector('[data-cancel]').onclick=close;ov.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('[type=submit]');b.disabled=true;try{await onSubmit(new FormData(e.currentTarget));close();await refresh()}catch(err){alert(err.message||err);b.disabled=false}};
  }

  function editAccount(q={}){
    modal(q.id?'Editar cuenta':'Nueva cuenta','<div class="cc-grid"><div class="cc-field"><label>Nombre *</label><input name="nombre" required value="'+esc(q.nombre||'')+'"></div><div class="cc-field"><label>Saldo inicial</label><input name="saldo" type="number" step="0.01" value="'+Number(q.saldoInicial||0)+'"></div><div class="cc-field"><label>Estatus</label><select name="estatus"><option '+(q.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option '+(q.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div></div><div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:12px"><label><input type="checkbox" name="ops" '+(q.usoOperadores?'checked':'')+'> Anticipos a operadores</label><label><input type="checkbox" name="resp" '+(q.usoCajaChica?'checked':'')+'> Anticipos a responsables</label></div>',async fd=>{if(!fd.get('ops')&&!fd.get('resp'))throw new Error('Selecciona al menos un uso para la cuenta.');const r=await sb().rpc('cc_ant_save_catalog',{p_tipo:'CUENTA',p_item:{id:q.id||'',nombre:String(fd.get('nombre')||''),tipo:'CUENTA',saldoInicial:Number(fd.get('saldo')||0),estatus:String(fd.get('estatus')||'ACTIVO'),usoOperadores:!!fd.get('ops'),usoCajaChica:!!fd.get('resp')}});if(r.error)throw r.error});
  }

  function transfer(){
    const qs=active(cache.extra?.cuentas||[]);if(qs.length<2){alert('Necesitas al menos dos cuentas activas.');return}
    const opts=qs.map(q=>'<option value="'+esc(q.id)+'">'+esc(q.nombre)+' · '+money(q.saldo)+'</option>').join('');
    modal('Traspaso entre cuentas','<div class="cc-grid"><div class="cc-field"><label>Origen *</label><select name="origen" required><option value="">Seleccionar</option>'+opts+'</select></div><div class="cc-field"><label>Destino *</label><select name="destino" required><option value="">Seleccionar</option>'+opts+'</select></div><div class="cc-field"><label>Monto *</label><input name="monto" type="number" min="0.01" step="0.01" required></div><div class="cc-field"><label>Referencia</label><input name="ref"></div></div><div class="cc-field"><label>Observaciones</label><textarea name="obs"></textarea></div>',async fd=>{if(fd.get('origen')===fd.get('destino'))throw new Error('Origen y destino deben ser distintos.');const r=await sb().rpc('cc_ant_transfer_funds',{p_item:{cuentaOrigenId:fd.get('origen'),cuentaDestinoId:fd.get('destino'),monto:Number(fd.get('monto')||0),referencia:String(fd.get('ref')||''),observaciones:String(fd.get('obs')||'')}});if(r.error)throw r.error});
  }

  function renderAccountCatalog(){
    const root=document.getElementById('ccAntViewCatalogos');if(!root)return;
    let card=[...root.querySelectorAll('.cc-config-card')].find(x=>/Cuentas/i.test(x.textContent||''));
    if(!card){const grid=root.querySelector('.cc-ant-report-grid')||root;card=document.createElement('div');card.className='cc-config-card';grid.appendChild(card)}
    const qs=cache.extra?.cuentas||[], tr=cache.extra?.traspasos||[];
    card.innerHTML='<div class="cc-toolbar"><div><strong>Cuentas</strong><div class="cc-note">Único catálogo para saldos, usos, movimientos y traspasos.</div></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="cc-btn cc-btn-primary" data-new>Nueva cuenta</button><button class="cc-btn cc-btn-light" data-mov>Registrar movimiento</button><button class="cc-btn cc-btn-light" data-trans>Traspaso</button></div></div><div style="overflow:auto"><table class="cc-ant-table"><thead><tr><th>CUENTA</th><th>SALDO</th><th>USO</th><th>ESTATUS</th><th></th></tr></thead><tbody>'+qs.map(q=>'<tr><td><strong>'+esc(q.nombre)+'</strong></td><td><strong>'+money(q.saldo)+'</strong></td><td>'+[(q.usoOperadores?'Operadores':''),(q.usoCajaChica?'Responsables':'')].filter(Boolean).join(' / ')+'</td><td>'+esc(q.estatus||'')+'</td><td><button class="cc-btn cc-btn-light" data-edit="'+esc(q.id)+'">Editar</button></td></tr>').join('')+'</tbody></table></div><div style="margin-top:12px"><strong>Historial de traspasos</strong><div class="cc-inv-wrap" style="max-height:200px"><table class="cc-ant-table"><thead><tr><th>FECHA</th><th>ORIGEN</th><th>DESTINO</th><th>MONTO</th></tr></thead><tbody>'+(tr.length?tr.slice(0,25).map(x=>'<tr><td>'+esc(String(x.fecha||'').slice(0,10))+'</td><td>'+esc(x.origen||'')+'</td><td>'+esc(x.destino||'')+'</td><td>'+money(x.monto)+'</td></tr>').join(''):'<tr><td colspan="4" style="text-align:center;color:#94a3b8">Sin traspasos.</td></tr>')+'</tbody></table></div></div>';
    card.querySelector('[data-new]').onclick=()=>editAccount();card.querySelector('[data-trans]').onclick=transfer;card.querySelector('[data-mov]').onclick=()=>window.ccAntMovimientoCaja?.();card.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editAccount(qs.find(q=>q.id===b.dataset.edit)||{}));
  }

  async function refresh(){try{await load();cleanNav();renderFilter();renderKpis();renderAccountCatalog()}catch(e){console.warn('Cuentas/KPIs anticipos',e)}}
  function install(){cleanNav();refresh();if(typeof window.ccAntRender==='function'&&!window.ccAntRender.__cuentaKpis){const o=window.ccAntRender,w=function(){const r=o.apply(this,arguments);setTimeout(refresh,0);return r};w.__cuentaKpis=true;window.ccAntRender=w}if(typeof window.ccAntView==='function'&&!window.ccAntView.__cuentaCatalog){const o=window.ccAntView,w=function(v,b){const r=o.apply(this,arguments);if(v==='catalogos')setTimeout(refresh,0);cleanNav();return r};w.__cuentaCatalog=true;window.ccAntView=w}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();
'''

text=P.read_text(encoding='utf-8')
marker='/* Tráfico App Profesional · Cuenta única en Catálogos + KPIs por cuenta */'
if marker not in text:
    P.write_text(text+extra,encoding='utf-8')
print('Cuentas consolidadas en Catálogos y KPIs filtrables por cuenta')
