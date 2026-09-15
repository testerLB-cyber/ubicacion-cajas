/* Tráfico App · Anticipos · selector de reportes + movimientos de cajas (Cuenta T) v1 */
(function(){
  'use strict';
  if(window.__CC_ANT_REPORT_SELECTOR_CAJA_T_V1__)return;
  window.__CC_ANT_REPORT_SELECTOR_CAJA_T_V1__=true;

  const sb=()=>window.gmSupabase;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const dateOnly=v=>String(v||'').slice(0,10);
  let selected='operador';
  let cache=null;
  let types=[];
  let loading=false;

  function style(){
    if(document.getElementById('ccAntReportSelectorTStyle'))return;
    const s=document.createElement('style');s.id='ccAntReportSelectorTStyle';s.textContent=`
#ccAntReportSelectorV1{display:flex;flex-wrap:wrap;gap:7px;padding:10px 0 12px;margin-bottom:10px;border-bottom:1px solid #e2e8f0}
#ccAntReportSelectorV1 button{border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:8px;padding:7px 10px;font-size:10.5px;font-weight:800;cursor:pointer}
#ccAntReportSelectorV1 button.active{background:#0f172a;color:#fff;border-color:#0f172a}
#ccAntMovCajaT{display:none;border:1px solid #e2e8f0;border-radius:12px;background:#fff;overflow:hidden;margin-top:10px}
#ccAntMovCajaT .cc-t-head{padding:12px 14px;border-bottom:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}
#ccAntMovCajaT .cc-t-filters{padding:12px 14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;border-bottom:1px solid #e2e8f0}
#ccAntMovCajaT .cc-t-kpis{padding:12px 14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
#ccAntMovCajaT .cc-t-kpi{border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#f8fafc}.cc-t-kpi small{display:block;color:#64748b;font-size:10px}.cc-t-kpi strong{font-size:16px}
#ccAntMovCajaT .cc-t-grid{display:grid;grid-template-columns:1fr 1fr;border-top:2px solid #0f172a}
#ccAntMovCajaT .cc-t-col{min-width:0}.cc-t-col:first-child{border-right:2px solid #0f172a}.cc-t-col h4{margin:0;padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px}.cc-t-scroll{overflow:auto;max-height:460px}
#ccAntMovCajaT table{width:100%;border-collapse:collapse;font-size:10.5px}#ccAntMovCajaT th,#ccAntMovCajaT td{padding:7px 8px;border-bottom:1px solid #f1f5f9;text-align:left;vertical-align:top}#ccAntMovCajaT th{position:sticky;top:0;background:#fff;z-index:1;color:#475569}
#ccAntMovCajaT .cc-t-total{padding:10px 12px;font-weight:900;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between}
@media(max-width:760px){#ccAntMovCajaT .cc-t-grid{grid-template-columns:1fr}.cc-t-col:first-child{border-right:0;border-bottom:2px solid #0f172a}}
`;document.head.appendChild(s);
  }

  function commonRoot(){
    const ids=['ccAntRepFiltroOperador','ccAntRepKpis','ccAntRepOperador','ccAntRepDetalle','ccAntRepConcepto'];
    const nodes=ids.map(id=>document.getElementById(id)).filter(Boolean);
    if(!nodes.length)return null;
    let root=nodes[0];
    while(root&& !nodes.every(n=>root.contains(n)))root=root.parentElement;
    return root||nodes[0].parentElement;
  }

  function tableBlock(id,root){
    const el=document.getElementById(id);if(!el)return null;
    const card=el.closest('.cc-config-card,.cc-ant-card,.cc-card,section,article');
    if(card&&card!==root)return card;
    const table=el.closest('table');
    return table?.parentElement||table||el;
  }

  function reportBlocks(root){
    return {
      resumen:document.getElementById('ccAntRepKpis'),
      operador:tableBlock('ccAntRepOperador',root),
      detalle:tableBlock('ccAntRepDetalle',root),
      concepto:tableBlock('ccAntRepConcepto',root)
    };
  }

  function selector(root){
    let bar=document.getElementById('ccAntReportSelectorV1');
    if(!bar){
      bar=document.createElement('div');bar.id='ccAntReportSelectorV1';
      bar.innerHTML='<button type="button" data-r="resumen">Resumen</button><button type="button" data-r="operador">Por operador</button><button type="button" data-r="detalle">Detalle histórico</button><button type="button" data-r="concepto">Por concepto</button><button type="button" data-r="caja">Movimientos de cajas</button>';
      root.insertBefore(bar,root.firstChild);
      bar.onclick=e=>{const b=e.target.closest('[data-r]');if(!b)return;selected=b.dataset.r;apply(root);if(selected==='caja')renderT().catch(err=>showTError(err));};
    }
    return bar;
  }

  function ensureT(root){
    let p=document.getElementById('ccAntMovCajaT');if(p)return p;
    p=document.createElement('div');p.id='ccAntMovCajaT';
    p.innerHTML='<div class="cc-t-head"><div><strong>Movimientos de cajas</strong><div class="cc-note">Cuenta T de ingresos y egresos. Consulta saldo actual o un periodo específico.</div></div><button type="button" class="cc-btn cc-btn-light" id="ccAntTRefresh">Actualizar</button></div><div class="cc-t-filters"><div class="cc-field"><label>Desde</label><input id="ccAntTDesde" type="date"></div><div class="cc-field"><label>Hasta</label><input id="ccAntTHasta" type="date"></div><div class="cc-field"><label>Cuenta</label><select id="ccAntTCuenta"><option value="">Todas las cuentas</option></select></div></div><div class="cc-t-kpis" id="ccAntTKpis"></div><div class="cc-t-grid"><div class="cc-t-col"><h4>INGRESOS</h4><div class="cc-t-scroll"><table><thead><tr><th>Fecha</th><th>Cuenta</th><th>Concepto / referencia</th><th>Monto</th></tr></thead><tbody id="ccAntTIngresos"></tbody></table></div><div class="cc-t-total"><span>Total ingresos</span><span id="ccAntTIngresosTotal">$0.00</span></div></div><div class="cc-t-col"><h4>EGRESOS</h4><div class="cc-t-scroll"><table><thead><tr><th>Fecha</th><th>Cuenta</th><th>Concepto / referencia</th><th>Monto</th></tr></thead><tbody id="ccAntTEgresos"></tbody></table></div><div class="cc-t-total"><span>Total egresos</span><span id="ccAntTEgresosTotal">$0.00</span></div></div></div>';
    root.appendChild(p);
    p.querySelector('#ccAntTRefresh').onclick=()=>renderT(true).catch(err=>showTError(err));
    p.querySelector('#ccAntTDesde').onchange=()=>renderT().catch(err=>showTError(err));
    p.querySelector('#ccAntTHasta').onchange=()=>renderT().catch(err=>showTError(err));
    p.querySelector('#ccAntTCuenta').onchange=()=>renderT().catch(err=>showTError(err));
    return p;
  }

  function apply(root){
    const bar=selector(root),blocks=reportBlocks(root),t=ensureT(root);
    bar.querySelectorAll('[data-r]').forEach(b=>b.classList.toggle('active',b.dataset.r===selected));
    Object.entries(blocks).forEach(([k,el])=>{if(el)el.style.setProperty('display',k===selected?'':'none','important');});
    t.style.display=selected==='caja'?'block':'none';
    const filter=document.getElementById('ccAntRepFiltroOperador');
    const filterWrap=filter?.closest('.cc-grid,.cc-toolbar,.cc-config-card');
    if(filterWrap&&filterWrap!==root)filterWrap.style.display=selected==='caja'?'none':'';
  }

  async function load(force=false){
    if(cache&&!force)return cache;if(loading){await new Promise(r=>setTimeout(r,80));return load(force);}loading=true;
    try{
      const c=sb();if(!c)throw new Error('Supabase no está disponible.');
      const [a,t]=await Promise.all([c.rpc('cc_ant_list'),c.from('cc_ant_tipos_movimiento_caja').select('id,nombre,naturaleza,estatus')]);
      if(a.error)throw a.error;if(t.error)throw t.error;if(a.data?.ok===false)throw new Error(a.data.error||'No se pudo cargar Anticipos.');
      cache=a.data||{};types=t.data||[];return cache;
    }finally{loading=false;}
  }

  function nature(x){
    const t=types.find(z=>String(z.id)===String(x.tipo_movimiento_id));
    if(t?.naturaleza)return String(t.naturaleza).toUpperCase();
    return ['DEPOSITO','DEVOLUCION','AJUSTE_ENTRADA'].includes(String(x.tipo||'').toUpperCase())?'ENTRADA':'SALIDA';
  }
  function movementName(x){const t=types.find(z=>String(z.id)===String(x.tipo_movimiento_id));return t?.nombre||x.tipo||'Movimiento';}

  async function renderT(force=false){
    const root=commonRoot();if(!root)return;const p=ensureT(root);const D=await load(force);
    const sel=p.querySelector('#ccAntTCuenta'),cur=sel.value;
    sel.innerHTML='<option value="">Todas las cuentas</option>'+(D.cuentas||[]).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.nombre)+'</option>').join('');sel.value=cur;
    const de=p.querySelector('#ccAntTDesde').value||'',ha=p.querySelector('#ccAntTHasta').value||'',ci=sel.value||'';
    const accounts=(D.cuentas||[]).filter(c=>!ci||String(c.id)===String(ci));
    const accountIds=new Set(accounts.map(c=>String(c.id)));
    const all=(D.movimientos||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO'&&accountIds.has(String(x.cuenta_id)));
    let opening=accounts.reduce((s,c)=>s+Number(c.saldo_inicial||0),0);
    if(de){all.filter(x=>dateOnly(x.fecha)<de).forEach(x=>{opening+=nature(x)==='ENTRADA'?Number(x.monto||0):-Number(x.monto||0);});}
    const rows=all.filter(x=>{const d=dateOnly(x.fecha);return(!de||d>=de)&&(!ha||d<=ha);}).sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)));
    const ingresos=rows.filter(x=>nature(x)==='ENTRADA'),egresos=rows.filter(x=>nature(x)==='SALIDA');
    const tin=ingresos.reduce((s,x)=>s+Number(x.monto||0),0),tout=egresos.reduce((s,x)=>s+Number(x.monto||0),0),final=opening+tin-tout;
    const label=ha?'Saldo al '+ha:'Saldo actual';
    p.querySelector('#ccAntTKpis').innerHTML='<div class="cc-t-kpi"><small>Saldo inicial del periodo</small><strong>'+money(opening)+'</strong></div><div class="cc-t-kpi"><small>Ingresos</small><strong>'+money(tin)+'</strong></div><div class="cc-t-kpi"><small>Egresos</small><strong>'+money(tout)+'</strong></div><div class="cc-t-kpi"><small>'+esc(label)+'</small><strong>'+money(final)+'</strong></div><div class="cc-t-kpi"><small>Movimientos</small><strong>'+rows.length+'</strong></div>';
    const accountName=id=>(D.cuentas||[]).find(c=>String(c.id)===String(id))?.nombre||'—';
    const row=x=>'<tr><td>'+esc(dateOnly(x.fecha)||'—')+'</td><td>'+esc(accountName(x.cuenta_id))+'</td><td><strong>'+esc(movementName(x))+'</strong><div style="font-size:9px;color:#64748b">'+esc(x.referencia||x.observaciones||'—')+'</div></td><td><strong>'+money(x.monto)+'</strong></td></tr>';
    p.querySelector('#ccAntTIngresos').innerHTML=ingresos.length?ingresos.map(row).join(''):'<tr><td colspan="4" style="padding:18px;text-align:center;color:#94a3b8">Sin ingresos en el periodo.</td></tr>';
    p.querySelector('#ccAntTEgresos').innerHTML=egresos.length?egresos.map(row).join(''):'<tr><td colspan="4" style="padding:18px;text-align:center;color:#94a3b8">Sin egresos en el periodo.</td></tr>';
    p.querySelector('#ccAntTIngresosTotal').textContent=money(tin);p.querySelector('#ccAntTEgresosTotal').textContent=money(tout);
  }

  function showTError(err){const p=document.getElementById('ccAntMovCajaT');if(!p)return;p.querySelector('#ccAntTKpis').innerHTML='<div class="cc-note" style="color:#b91c1c">'+esc(err?.message||err)+'</div>';}

  function install(){
    style();
    const root=commonRoot();if(!root)return false;
    selector(root);ensureT(root);apply(root);
    const old=window.ccAntRenderReportes;
    if(typeof old==='function'&&!old.__ccReportSelectorT){const wrap=function(){const r=old.apply(this,arguments);setTimeout(()=>{const rt=commonRoot();if(rt)apply(rt);},0);return r;};wrap.__ccReportSelectorT=true;window.ccAntRenderReportes=wrap;}
    return true;
  }
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>40)clearInterval(timer);},250);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
