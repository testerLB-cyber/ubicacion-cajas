(()=>{
  const esc2=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money2=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const date2=v=>{try{return v?new Date(v).toLocaleDateString('es-MX'):'—'}catch(_){return '—'}};
  function groupedAnticipos(){
    const rows=(HIST?.anticipos||[]), map=new Map();
    for(const x of rows){
      const key=x.anticipoId||x.folio||'SIN_ID';
      if(!map.has(key)) map.set(key,{anticipoId:key,folio:x.folio||'Anticipo',estatus:x.estatus||'ACEPTADA',fecha:x.fecha,destino:x.destino||'',unidad:x.unidad||'',montoEntregado:Number(x.montoEntregado||0),comprobaciones:[]});
      const g=map.get(key);g.comprobaciones.push(x);if(!g.montoEntregado&&x.montoEntregado)g.montoEntregado=Number(x.montoEntregado||0);if(x.estatus)g.estatus=x.estatus;
    }
    return [...map.values()].sort((a,b)=>new Date(b.fecha||b.comprobaciones[0]?.fechaComprobacion||0)-new Date(a.fecha||a.comprobaciones[0]?.fechaComprobacion||0));
  }
  function antHtml(){
    const groups=groupedAnticipos();
    if(!groups.length)return '<div class="empty">Sin anticipos comprobados.</div>';
    return groups.map(g=>{
      const total=g.comprobaciones.reduce((s,x)=>s+Number(x.monto||0),0);
      const detail=g.comprobaciones.map((x,i)=>'<div class="pre" style="margin-top:8px"><div class="top"><strong>Comprobación '+(i+1)+'</strong><span class="pill ok">'+esc2(x.cierreEstado||'ACEPTADA')+'</span></div><div class="hist-grid"><div><b>FECHA</b><span>'+date2(x.fechaComprobacion||x.fecha)+'</span></div><div><b>MONTO</b><span>'+money2(x.monto)+'</span></div><div><b>CONCEPTO</b><span>'+esc2(x.concepto||'—')+'</span></div><div><b>TIPO</b><span>'+esc2(x.tipoDocumento||'—')+'</span></div><div><b>FOLIO DOC.</b><span>'+esc2(x.folioDocumento||'—')+'</span></div><div><b>ORIGEN</b><span>'+esc2(x.origen||'—')+'</span></div></div>'+(x.observaciones?'<small>Observaciones: '+esc2(x.observaciones)+'</small>':'')+'</div>').join('');
      return '<details class="hist" style="padding:0;overflow:hidden"><summary style="list-style:none;padding:14px;cursor:pointer"><div class="top"><strong>'+esc2(g.folio)+'</strong><span class="pill ok">'+esc2(g.estatus)+'</span></div><small>'+esc2(g.destino||'Sin destino')+(g.unidad?' · Unidad '+esc2(g.unidad):'')+'</small><div class="summary"><div class="metric"><small>ENTREGADO</small><strong>'+money2(g.montoEntregado)+'</strong></div><div class="metric"><small>COMPROBADO</small><strong>'+money2(total)+'</strong></div></div><small>'+g.comprobaciones.length+' comprobación(es) · Toca para ver detalle</small></summary><div style="padding:0 14px 14px">'+detail+'</div></details>';
    }).join('');
  }
  function hojasHtml(){
    const rows=HIST?.hojas||[];
    return rows.length?rows.map(x=>'<div class="hist"><div class="top"><strong>'+esc2(x.folio||'Hoja')+'</strong><span class="pill ok">UTILIZADA</span></div><div class="hist-grid"><div><b>FECHA USO</b><span>'+date2(x.fechaUso)+'</span></div><div><b>COMPROBADA</b><span>'+date2(x.fechaComprobacion)+'</span></div><div><b>CLIENTE</b><span>'+esc2(x.cliente||'—')+'</span></div><div><b>TIPO VIAJE</b><span>'+esc2(x.tipoViaje||'—')+'</span></div><div><b>CLASIFICACIÓN</b><span>'+esc2(x.clasificacion||'—')+'</span></div><div><b>RESPONSABLE</b><span>'+esc2(x.responsable||'—')+'</span></div></div>'+(x.observaciones?'<small>Observaciones: '+esc2(x.observaciones)+'</small>':'')+'</div>').join(''):'<div class="empty">Sin hojas utilizadas.</div>';
  }
  renderHistory=function(){
    const op=HIST?.usuario?.operadorNombre||'Operador';
    $('histOperator').textContent=op+' · solo lectura';
    $('tabAnt').classList.toggle('active',HIST_TAB==='ANT');
    $('tabHs').classList.toggle('active',HIST_TAB==='HS');
    $('histRows').innerHTML=HIST_TAB==='ANT'?antHtml():hojasHtml();
    show('history');
  };
  const oldMenu=renderMenu;
  renderMenu=function(){oldMenu();const b=$('menuHistCount');if(b){const ant=new Set((HIST?.anticipos||[]).map(x=>x.anticipoId||x.folio)).size;b.textContent=ant+(HIST?.hojas||[]).length;}};
})();