(()=>{
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const date=v=>{try{return v?new Date(v).toLocaleDateString('es-MX'):'—'}catch(_){return '—'}};
  function groupedAnticipos(){
    const rows=(window.HIST?.anticipos||[]), map=new Map();
    for(const x of rows){
      const key=x.anticipoId||x.folio||'SIN_ID';
      if(!map.has(key)) map.set(key,{anticipoId:key,folio:x.folio||'Anticipo',estatus:x.estatus||'ACEPTADA',fecha:x.fecha,destino:x.destino||'',unidad:x.unidad||'',montoEntregado:Number(x.montoEntregado||0),comprobaciones:[]});
      const g=map.get(key); g.comprobaciones.push(x);
      if(!g.montoEntregado&&x.montoEntregado) g.montoEntregado=Number(x.montoEntregado||0);
      if(x.estatus) g.estatus=x.estatus;
    }
    return [...map.values()].sort((a,b)=>new Date(b.fecha||b.comprobaciones[0]?.fechaComprobacion||0)-new Date(a.fecha||a.comprobaciones[0]?.fechaComprobacion||0));
  }
  function antHtml(){
    const groups=groupedAnticipos();
    if(!groups.length) return '<div class="empty">Sin anticipos comprobados.</div>';
    return groups.map(g=>{
      const total=g.comprobaciones.reduce((s,x)=>s+Number(x.monto||0),0);
      const detail=g.comprobaciones.map((x,i)=>'<div class="pre" style="margin-top:8px"><div class="top"><strong>Comprobación '+(i+1)+'</strong><span class="pill ok">'+esc(x.cierreEstado||'ACEPTADA')+'</span></div><div class="hist-grid"><div><b>FECHA</b><span>'+date(x.fechaComprobacion||x.fecha)+'</span></div><div><b>MONTO</b><span>'+money(x.monto)+'</span></div><div><b>CONCEPTO</b><span>'+esc(x.concepto||'—')+'</span></div><div><b>TIPO</b><span>'+esc(x.tipoDocumento||'—')+'</span></div><div><b>FOLIO DOC.</b><span>'+esc(x.folioDocumento||'—')+'</span></div><div><b>ORIGEN</b><span>'+esc(x.origen||'—')+'</span></div></div>'+(x.observaciones?'<small>Observaciones: '+esc(x.observaciones)+'</small>':'')+'</div>').join('');
      return '<details class="hist" style="padding:0;overflow:hidden"><summary style="list-style:none;padding:14px;cursor:pointer"><div class="top"><strong>'+esc(g.folio)+'</strong><span class="pill ok">'+esc(g.estatus)+'</span></div><small>'+esc(g.destino||'Sin destino')+(g.unidad?' · Unidad '+esc(g.unidad):'')+'</small><div class="summary"><div class="metric"><small>ENTREGADO</small><strong>'+money(g.montoEntregado)+'</strong></div><div class="metric"><small>COMPROBADO</small><strong>'+money(total)+'</strong></div></div><small>'+g.comprobaciones.length+' comprobación(es) · Toca para ver detalle</small></summary><div style="padding:0 14px 14px">'+detail+'</div></details>';
    }).join('');
  }
  function hojasHtml(){
    const rows=window.HIST?.hojas||[];
    return rows.length?rows.map(x=>'<div class="hist"><div class="top"><strong>'+esc(x.folio||'Hoja')+'</strong><span class="pill ok">UTILIZADA</span></div><div class="hist-grid"><div><b>FECHA USO</b><span>'+date(x.fechaUso)+'</span></div><div><b>COMPROBADA</b><span>'+date(x.fechaComprobacion)+'</span></div><div><b>CLIENTE</b><span>'+esc(x.cliente||'—')+'</span></div><div><b>TIPO VIAJE</b><span>'+esc(x.tipoViaje||'—')+'</span></div><div><b>CLASIFICACIÓN</b><span>'+esc(x.clasificacion||'—')+'</span></div><div><b>RESPONSABLE</b><span>'+esc(x.responsable||'—')+'</span></div></div>'+(x.observaciones?'<small>Observaciones: '+esc(x.observaciones)+'</small>':'')+'</div>').join(''):'<div class="empty">Sin hojas utilizadas.</div>';
  }
  function groupedRenderHistory(){
    const op=window.HIST?.usuario?.operadorNombre||'Operador';
    const el=id=>document.getElementById(id);
    if(!el('histRows')) return;
    el('histOperator').textContent=op+' · solo lectura';
    el('tabAnt').classList.toggle('active',window.HIST_TAB==='ANT');
    el('tabHs').classList.toggle('active',window.HIST_TAB==='HS');
    el('histRows').innerHTML=window.HIST_TAB==='ANT'?antHtml():hojasHtml();
    if(typeof window.show==='function') window.show('history');
  }
  window.renderHistory=groupedRenderHistory;
  const oldMenu=window.renderMenu;
  if(typeof oldMenu==='function') window.renderMenu=function(){oldMenu();const b=document.getElementById('menuHistCount');if(b){const ant=new Set((window.HIST?.anticipos||[]).map(x=>x.anticipoId||x.folio)).size;b.textContent=ant+(window.HIST?.hojas||[]).length;}};
})();