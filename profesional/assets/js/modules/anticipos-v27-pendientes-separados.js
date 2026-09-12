/* Tráfico App Profesional · Anticipos v27 · Pendientes separados */
(function(){
  if(window.__ccAntPendientesV27)return; window.__ccAntPendientesV27=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const date=v=>v?new Date(v).toLocaleDateString('es-MX'):'—';
  let cache=[];

  function ensureLayout(){
    const view=document.getElementById('ccAntViewSaldos');if(!view)return null;
    const toolbar=view.querySelector('.cc-toolbar');
    if(toolbar){const strong=toolbar.querySelector('strong');if(strong)strong.textContent='Pendiente por comprobar';const note=toolbar.querySelector('.cc-note');if(note)note.textContent='Operadores y beneficiarios se muestran por separado. Presiona una persona para ver sus anticipos pendientes.';}
    const opTable=document.getElementById('ccAntSaldoBody')?.closest('.cc-inv-wrap');
    if(opTable&&!document.getElementById('ccAntOpTitleV27')){
      const title=document.createElement('div');title.id='ccAntOpTitleV27';title.style='margin:12px 0 7px;font-weight:900;font-size:13px;color:#0f172a';title.textContent='Pendiente por comprobar por operador';opTable.before(title);
    }
    let sec=document.getElementById('ccAntBenPendV27');
    if(!sec&&opTable){
      sec=document.createElement('div');sec.id='ccAntBenPendV27';sec.style='margin-top:18px';
      sec.innerHTML='<div class="cc-toolbar" style="margin-bottom:8px"><div><strong>Pendiente por comprobar por beneficiario</strong><div class="cc-note">Anticipos de caja chica / beneficiarios, separados de los operadores.</div></div></div><div class="cc-dot-filters" style="grid-template-columns:minmax(220px,420px);margin-bottom:8px"><div><label>Beneficiario</label><select id="ccAntSaldoBeneficiario"><option value="">Todos</option></select></div></div><div class="cc-inv-wrap" style="max-height:50vh;overflow:auto"><table class="cc-ant-table"><thead><tr><th>BENEFICIARIO</th><th>ANTICIPOS ABIERTOS</th><th>ENTREGADO</th><th>COMPROBADO / DEVUELTO</th><th>PENDIENTE</th></tr></thead><tbody id="ccAntSaldoBenBody"></tbody></table></div>';
      opTable.insertAdjacentElement('afterend',sec);
      sec.querySelector('#ccAntSaldoBeneficiario').onchange=()=>window.ccAntRenderSaldos?.();
    }
    return view;
  }
  function group(rows,keyId,keyName){
    const g={};
    rows.forEach(a=>{const id=a[keyId]||'',name=a[keyName]||'Sin nombre';if(!g[id])g[id]={id,nombre:name,anticipos:[],entregado:0,aplicado:0,pendiente:0};const x=g[id];x.anticipos.push(a);x.entregado+=Number(a.montoEntregado||0);x.aplicado+=Number(a.comprobado||0)+Number(a.devuelto||0);x.pendiente+=Number(a.pendiente||0)});
    return Object.values(g).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
  }
  function applyStatus(vals,tv){if(tv==='CON_PENDIENTE')return vals.filter(x=>x.pendiente>0);if(tv==='SIN_PENDIENTE')return vals.filter(x=>x.pendiente<=0);return vals}
  function renderTable(body,vals,attr,empty){if(!body)return;body.innerHTML=vals.map(g=>'<tr '+attr+'="'+esc(g.id)+'" style="cursor:pointer"><td><strong>'+esc(g.nombre)+'</strong><div style="font-size:9px;color:#64748b">Presiona para ver anticipos</div></td><td>'+g.anticipos.length+'</td><td>'+money(g.entregado)+'</td><td>'+money(g.aplicado)+'</td><td><strong style="color:'+(g.pendiente>0?'#b45309':'#166534')+'">'+money(g.pendiente)+'</strong></td></tr>').join('')||'<tr><td colspan="5" style="padding:22px;text-align:center;color:#94a3b8">'+empty+'</td></tr>'}

  window.ccAntRenderSaldos=async function(){
    ensureLayout();
    const opSel=document.getElementById('ccAntSaldoOperador'),tp=document.getElementById('ccAntSaldoTipo'),benSel=document.getElementById('ccAntSaldoBeneficiario');if(!opSel||!tp)return;
    try{
      const r=await sb().rpc('cc_ant_pendientes_personas');if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudieron cargar pendientes');cache=r.data.anticipos||[];
      const tv=tp.value||'',ov=opSel.value||'',bv=benSel?.value||'';
      const opsRows=cache.filter(a=>!a.esCajaChica&&a.operadorId&&(!ov||a.operadorId===ov));
      const benRows=cache.filter(a=>(a.esCajaChica||a.responsableId)&&a.responsableId&&(!bv||a.responsableId===bv));
      let ops=applyStatus(group(opsRows,'operadorId','operador'),tv),bens=applyStatus(group(benRows,'responsableId','beneficiario'),tv);
      const opCurrent=opSel.value;opSel.innerHTML='<option value="">Todos</option>'+group(cache.filter(a=>!a.esCajaChica&&a.operadorId),'operadorId','operador').map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');opSel.value=opCurrent;
      if(benSel){const c=benSel.value;benSel.innerHTML='<option value="">Todos</option>'+group(cache.filter(a=>(a.esCajaChica||a.responsableId)&&a.responsableId),'responsableId','beneficiario').map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('');benSel.value=c;}
      const totalPend=ops.reduce((s,x)=>s+x.pendiente,0)+bens.reduce((s,x)=>s+x.pendiente,0),ants=ops.reduce((s,x)=>s+x.anticipos.length,0)+bens.reduce((s,x)=>s+x.anticipos.length,0);
      const k=document.getElementById('ccAntSaldoKpis');if(k)k.innerHTML='<div class="cc-ant-kpi"><small>Operadores con pendiente</small><strong>'+ops.filter(x=>x.pendiente>0).length+'</strong></div><div class="cc-ant-kpi"><small>Beneficiarios con pendiente</small><strong>'+bens.filter(x=>x.pendiente>0).length+'</strong></div><div class="cc-ant-kpi"><small>Anticipos abiertos</small><strong>'+ants+'</strong></div><div class="cc-ant-kpi"><small>Total pendiente</small><strong>'+money(totalPend)+'</strong></div>';
      const ob=document.getElementById('ccAntSaldoBody'),bb=document.getElementById('ccAntSaldoBenBody');renderTable(ob,ops,'data-v27-op','Sin operadores registrados.');renderTable(bb,bens,'data-v27-ben','Sin beneficiarios con anticipos abiertos.');
      if(ob)ob.onclick=e=>{const tr=e.target.closest('[data-v27-op]');if(tr)openDetail('OPERADOR',tr.dataset.v27Op)};
      if(bb)bb.onclick=e=>{const tr=e.target.closest('[data-v27-ben]');if(tr)openDetail('BENEFICIARIO',tr.dataset.v27Ben)};
    }catch(e){console.warn('Anticipos v27',e);const bb=document.getElementById('ccAntSaldoBenBody');if(bb)bb.innerHTML='<tr><td colspan="5" style="padding:20px;color:#b91c1c">'+esc(e.message||e)+'</td></tr>'}
  };

  function openDetail(tipo,id){
    const ants=cache.filter(a=>tipo==='OPERADOR'?(!a.esCajaChica&&a.operadorId===id):((a.esCajaChica||a.responsableId)&&a.responsableId===id));
    const name=tipo==='OPERADOR'?(ants[0]?.operador||'Operador'):(ants[0]?.beneficiario||'Beneficiario');
    document.getElementById('ccAntOpPendModal')?.remove();document.getElementById('ccAntBenPendModalV27')?.remove();
    const ov=document.createElement('div');ov.id=tipo==='OPERADOR'?'ccAntOpPendModal':'ccAntBenPendModalV27';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.76);z-index:2147483300;display:flex;align-items:center;justify-content:center;padding:10px';
    const rows=ants.map(a=>'<tr><td><strong>'+esc(a.folio)+'</strong><div style="font-size:10px;color:#64748b">'+date(a.fecha)+'</div></td>'+(tipo==='OPERADOR'?'<td>'+esc(a.destino||'—')+'</td><td>'+esc(a.unidad||'—')+'</td>':'')+'<td>'+money(a.montoEntregado)+'</td><td>'+money(a.comprobado)+'</td><td>'+money(a.devuelto)+'</td><td><strong>'+money(a.pendiente)+'</strong></td><td>'+(Number(a.pendiente)>0?'<button class="cc-btn cc-btn-primary" data-v27-comp="'+esc(a.id)+'">Comprobar</button>':'<span class="cc-badge">Sin pendiente</span>')+'</td></tr>').join('');
    const extra=tipo==='OPERADOR'?'<th>DESTINO</th><th>UNIDAD</th>':'';
    ov.innerHTML='<div style="background:#fff;width:min(1180px,99vw);height:min(760px,95vh);display:flex;flex-direction:column;border-radius:18px;overflow:hidden;box-shadow:0 30px 90px rgba(15,23,42,.45)"><div style="padding:16px 20px;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center"><div><strong style="font-size:18px">'+esc(name)+'</strong><div style="font-size:11px;color:#cbd5e1;margin-top:3px">Anticipos pendientes · '+(tipo==='OPERADOR'?'Operador':'Beneficiario')+'</div></div><button data-v27-close style="background:none;border:0;color:#fff;font-size:28px;cursor:pointer">×</button></div><div style="padding:20px;overflow:auto;flex:1"><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>ANTICIPO</th>'+extra+'<th>ENTREGADO</th><th>COMPROBADO</th><th>DEVUELTO</th><th>PENDIENTE</th><th>ACCIÓN</th></tr></thead><tbody>'+((rows)||'<tr><td colspan="8" style="padding:25px;text-align:center">No tiene anticipos pendientes.</td></tr>')+'</tbody></table></div></div></div>';
    document.body.appendChild(ov);ov.querySelector('[data-v27-close]').onclick=()=>ov.remove();ov.onclick=e=>{const b=e.target.closest('[data-v27-comp]');if(b){const ant=b.dataset.v27Comp;ov.remove();window.ccAntComprobar?.(ant)}};
  }
  window.ccAntAbrirPendientesOperador=id=>openDetail('OPERADOR',id);
  window.ccAntAbrirPendientesBeneficiario=id=>openDetail('BENEFICIARIO',id);

  function boot(){ensureLayout();document.addEventListener('click',e=>{const b=e.target.closest?.('#ccPanelAnticipos [data-antv="saldos"]');if(b)setTimeout(()=>window.ccAntRenderSaldos?.(),120)},true)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900));else setTimeout(boot,900);
})();
