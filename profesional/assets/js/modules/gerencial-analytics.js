(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const inRange=t=>typeof estaEnRangoDeFechas==='function'?estaEnRangoDeFechas(t.fechaSalidaRaw):true;
  const pct=(a,b)=>b?((a/b)*100):0;
  const fmt=n=>Number(n||0).toLocaleString('es-MX');
  const setModal=(title,subtitle,body)=>{document.getElementById('gmModalTitle').textContent=title;document.getElementById('gmModalSubtitle').textContent=subtitle;document.getElementById('gmModalBody').innerHTML=body;const m=document.getElementById('gmInteractiveModal');m.classList.add('open');m.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';};
  window.cerrarPanelGerencialInteractivo=function(){const m=document.getElementById('gmInteractiveModal');m.classList.remove('open');m.setAttribute('aria-hidden','true');document.body.style.overflow='';};
  window.abrirPanelGerencialInteractivo=function(tipo){
    if(!window.rawTripsData && typeof rawTripsData==='undefined'){return;}
    const trips=(typeof rawTripsData!=='undefined'?rawTripsData:[]).filter(inRange);
    if(tipo==='alertas') return detalleAlertas(trips);
    if(tipo==='capacidad') return detalleCapacidad(trips);
    if(tipo==='concentracion') return detalleConcentracion(trips);
    if(tipo==='movimientos') return detalleMovimientos(trips);
    if(tipo==='prioridad') return detallePrioridad(trips);
  };
  function detalleAlertas(trips){
    const pendientes=(typeof pendingListData!=='undefined'?pendingListData:[]);
    const transito=(typeof transitoListData!=='undefined'?transitoListData:[]);
    const vacios=trips.filter(t=>t.isVacio);    const clients={};trips.forEach(t=>clients[t.cliente]=(clients[t.cliente]||0)+1);
    const top=Object.entries(clients).sort((a,b)=>b[1]-a[1])[0];
    let html=`<div class="gm-detail-kpis"><div class="gm-mini"><span>Pendientes</span><strong>${fmt(pendientes.length)}</strong><small>sin salida registrada</small></div><div class="gm-mini"><span>En tránsito</span><strong>${fmt(transito.length)}</strong><small>sin llegada registrada</small></div><div class="gm-mini"><span>Vacíos</span><strong>${fmt(vacios.length)}</strong><small>${pct(vacios.length,trips.length).toFixed(1)}% del volumen</small></div><div class="gm-mini"><span>Concentración</span><strong>${top?pct(top[1],trips.length).toFixed(1):0}%</strong><small>${top?esc(top[0]):'Sin cliente'}</small></div></div>`;
    html+=`<div class="gm-detail-grid"><div class="gm-detail-card"><h3>🚨 Pendientes que requieren acción</h3>`;
    if(!pendientes.length) html+=`<div class="gm-empty">No hay pendientes registrados.</div>`; else {html+=`<table class="gm-table"><thead><tr><th>Folio</th><th>Cliente</th><th>Operador</th><th>Unidad</th><th>Estatus</th></tr></thead><tbody>`;pendientes.slice(0,80).forEach(x=>html+=`<tr><td><strong>${esc(x.folio)}</strong></td><td>${esc(x.cliente)}</td><td>${esc(x.operador)}</td><td>${esc(x.unidad)}</td><td><span class="gm-tag gm-red">${esc(x.estatus)}</span></td></tr>`);html+=`</tbody></table>`;}
    html+=`</div><div class="gm-detail-card"><h3>🚚 Servicios en tránsito</h3>`;
    if(!transito.length) html+=`<div class="gm-empty">No hay servicios en tránsito.</div>`; else {html+=`<table class="gm-table"><thead><tr><th>Folio</th><th>Cliente</th><th>Operador</th><th>Salida</th></tr></thead><tbody>`;transito.slice(0,80).forEach(x=>html+=`<tr><td><strong>${esc(x.folio)}</strong></td><td>${esc(x.cliente)}</td><td>${esc(x.operador)}</td><td>${esc(x.fechaSalida)}</td></tr>`);html+=`</tbody></table>`;}
    html+=`</div></div><div class="gm-action"><button class="secondary" onclick="cerrarPanelGerencialInteractivo();document.getElementById('pendientesSection')?.scrollIntoView({behavior:'smooth'})">Ir a pendientes</button><button class="secondary" onclick="cerrarPanelGerencialInteractivo();document.getElementById('transitoSection')?.scrollIntoView({behavior:'smooth'})">Ir a tránsito</button></div>`;
    setModal('Alertas operativas','Detalle de los eventos que requieren seguimiento y dónde actuar.',html);
  }
  function detalleCapacidad(trips){
    const units={}; const ops={}; trips.forEach(t=>{if(t.camion&&t.camion!=='N/A') units[t.camion]=(units[t.camion]||0)+1;if(t.operador&&t.operador!=='SIN ASIGNAR') ops[t.operador]=(ops[t.operador]||0)+1;});
    const us=Object.entries(units).sort((a,b)=>b[1]-a[1]); const os=Object.entries(ops).sort((a,b)=>b[1]-a[1]); const maxU=us[0]?.[1]||1,maxO=os[0]?.[1]||1;
    const total=trips.length, activos=us.length, opAct=os.length, viajesUnidad=activos?total/activos:0, serviciosOp=opAct?total/opAct:0;
    let html=`<div class="gm-detail-kpis"><div class="gm-mini"><span>Unidades activas</span><strong>${fmt(activos)}</strong><small>${viajesUnidad.toFixed(1)} viajes por unidad</small></div><div class="gm-mini"><span>Operadores activos</span><strong>${fmt(opAct)}</strong><small>${serviciosOp.toFixed(1)} servicios por operador</small></div><div class="gm-mini"><span>Unidad líder</span><strong>${us[0]?esc(us[0][0]):'—'}</strong><small>${us[0]?fmt(us[0][1])+' servicios':'Sin datos'}</small></div><div class="gm-mini"><span>Operador líder</span><strong>${os[0]?esc(os[0][0]):'—'}</strong><small>${os[0]?fmt(os[0][1])+' servicios':'Sin datos'}</small></div></div>`;
    html+=`<div class="gm-detail-grid"><div class="gm-detail-card"><h3>🚛 Uso de unidades — ranking</h3><div class="gm-bars">`;us.slice(0,12).forEach(([n,v])=>html+=`<div class="gm-bar-row"><span title="${esc(n)}">${esc(n)}</span><div class="gm-bar-track"><div class="gm-bar-fill" style="width:${(v/maxU*100).toFixed(1)}%"></div></div><b>${fmt(v)}</b></div>`);html+=`</div></div><div class="gm-detail-card"><h3>👨‍✈️ Carga por operador — ranking</h3><div class="gm-bars">`;os.slice(0,12).forEach(([n,v])=>html+=`<div class="gm-bar-row"><span title="${esc(n)}">${esc(n)}</span><div class="gm-bar-track"><div class="gm-bar-fill" style="width:${(v/maxO*100).toFixed(1)}%"></div></div><b>${fmt(v)}</b></div>`);html+=`</div></div></div><div class="gm-action"><button class="secondary" onclick="cerrarPanelGerencialInteractivo();document.getElementById('operadorSection')?.scrollIntoView({behavior:'smooth'})">Ir a operadores</button></div>`;
    setModal('Capacidad y uso de recursos','La carga está distribuida entre unidades y operadores. Los gráficos permiten detectar concentración o subutilización.',html);
  }
  function detalleConcentracion(trips){
    // Concentración comercial: EXCLUSIVAMENTE Exportación + Importación + Foráneo.
    const core=trips.filter(t=>t.isExpo||t.isImpo||t.isForaneo);
    const map={};
    core.forEach(t=>{
      const c=t.cliente||'SIN CLIENTE ASIGNADO';
      if(!map[c]) map[c]={cliente:c,total:0,expo:0,impo:0,foraneo:0};
      map[c].total++;
      if(t.isExpo) map[c].expo++;
      if(t.isImpo) map[c].impo++;
      if(t.isForaneo) map[c].foraneo++;
    });
    const arr=Object.values(map).sort((a,b)=>b.total-a.total);
    const total=core.length;
    const top3=arr.slice(0,3).reduce((s,x)=>s+x.total,0);
    const max=arr[0]?.total||1;
    let html=`<div class="gm-detail-kpis"><div class="gm-mini"><span>Viajes analizados</span><strong>${fmt(total)}</strong><small>Solo Expo + Impo + Foráneo</small></div><div class="gm-mini"><span>Clientes</span><strong>${fmt(arr.length)}</strong><small>con operación core</small></div><div class="gm-mini"><span>Top 1</span><strong>${arr[0]?pct(arr[0].total,total).toFixed(1):0}%</strong><small>${arr[0]?esc(arr[0].cliente):'Sin datos'}</small></div><div class="gm-mini"><span>Top 3</span><strong>${pct(top3,total).toFixed(1)}%</strong><small>del volumen core</small></div></div>`;
    html+=`<div class="gm-detail-grid"><div class="gm-detail-card"><h3>📊 Concentración por cliente — solo operación core</h3>`;
    if(!arr.length){html+=`<div class="gm-empty">No existen viajes de Exportación, Importación o Foráneo en el periodo.</div>`;}
    else {html+=`<div class="gm-bars">`;arr.slice(0,15).forEach((x,i)=>html+=`<div class="gm-bar-row"><span>${i+1}. ${esc(x.cliente)}</span><div class="gm-bar-track"><div class="gm-bar-fill" style="width:${(x.total/max*100).toFixed(1)}%"></div></div><b>${pct(x.total,total).toFixed(1)}%</b></div>`);html+=`</div>`;}
    html+=`</div><div class="gm-detail-card"><h3>🔎 Comparación de composición</h3>`;
    if(arr.length){html+=`<table class="gm-table"><thead><tr><th>Cliente</th><th>Expo</th><th>Impo</th><th>Foráneo</th><th>Total</th><th>%</th></tr></thead><tbody>`;arr.slice(0,20).forEach(x=>html+=`<tr><td><strong>${esc(x.cliente)}</strong></td><td>${fmt(x.expo)}</td><td>${fmt(x.impo)}</td><td>${fmt(x.foraneo)}</td><td><strong>${fmt(x.total)}</strong></td><td><span class="gm-tag gm-blue">${pct(x.total,total).toFixed(1)}%</span></td></tr>`);html+=`</tbody></table>`;}
    html+=`</div></div><div class="gm-action"><button class="secondary" onclick="cerrarPanelGerencialInteractivo();document.getElementById('gerencialMatrizBody')?.scrollIntoView({behavior:'smooth'})">Ver matriz core completa</button></div>`;
    setModal('Concentración de clientes','La concentración comercial considera únicamente Exportación, Importación y Foráneo. Los demás movimientos quedan fuera de este indicador.',html);
  }

  function detalleMovimientos(trips){
    // Movimientos NO clasificables como Exportación, Importación o Foráneo.
    const mov=trips.filter(t=>!t.isExpo&&!t.isImpo&&!t.isForaneo);
    const byClient={}, byType={};
    mov.forEach(t=>{
      const c=t.cliente||'SIN CLIENTE ASIGNADO';
      byClient[c]=(byClient[c]||0)+1;
      const tipo=(t.tipo||t.clasificacion||'SIN TIPO').toString().trim().toUpperCase()||'SIN TIPO';
      byType[tipo]=(byType[tipo]||0)+1;
    });
    const clients=Object.entries(byClient).sort((a,b)=>b[1]-a[1]);
    const types=Object.entries(byType).sort((a,b)=>b[1]-a[1]);
    const total=mov.length,max=clients[0]?.[1]||1;
    let html=`<div class="gm-detail-kpis"><div class="gm-mini"><span>Movimientos</span><strong>${fmt(total)}</strong><small>Fuera de Expo + Impo + Foráneo</small></div><div class="gm-mini"><span>Clientes</span><strong>${fmt(clients.length)}</strong><small>con movimientos no core</small></div><div class="gm-mini"><span>Tipo principal</span><strong>${types[0]?esc(types[0][0]):'—'}</strong><small>${types[0]?fmt(types[0][1])+' movimientos':'Sin datos'}</small></div><div class="gm-mini"><span>Participación</span><strong>${pct(total,trips.length).toFixed(1)}%</strong><small>del total del periodo</small></div></div>`;
    html+=`<div class="gm-detail-grid"><div class="gm-detail-card"><h3>📋 Concentrado por cliente</h3>`;
    if(!clients.length) html+=`<div class="gm-empty">No hay movimientos fuera de Exportación, Importación y Foráneo.</div>`;
    else {html+=`<div class="gm-bars">`;clients.slice(0,15).forEach((x,i)=>html+=`<div class="gm-bar-row"><span>${i+1}. ${esc(x[0])}</span><div class="gm-bar-track"><div class="gm-bar-fill" style="width:${(x[1]/max*100).toFixed(1)}%"></div></div><b>${fmt(x[1])}</b></div>`);html+=`</div>`;}
    html+=`</div><div class="gm-detail-card"><h3>🔍 Tipos de movimiento</h3>`;
    if(types.length){html+=`<table class="gm-table"><thead><tr><th>Tipo / Clasificación</th><th>Movimientos</th><th>%</th></tr></thead><tbody>`;types.slice(0,20).forEach(x=>html+=`<tr><td><strong>${esc(x[0])}</strong></td><td>${fmt(x[1])}</td><td><span class="gm-tag gm-blue">${pct(x[1],total).toFixed(1)}%</span></td></tr>`);html+=`</tbody></table>`;}
    html+=`</div></div><div class="gm-detail-card" style="margin-top:16px"><h3>🧾 Listado de movimientos</h3>`;
    if(mov.length){html+=`<div style="max-height:330px;overflow:auto"><table class="gm-table"><thead><tr><th>Fecha</th><th>Folio / Viaje</th><th>Cliente</th><th>Operador</th><th>Unidad</th><th>Tipo</th><th>Clasificación</th></tr></thead><tbody>`;mov.slice(0,150).forEach(t=>html+=`<tr><td>${esc(t.fecha||'—')}</td><td><strong>${esc(t.viaje||'—')}</strong></td><td>${esc(t.cliente)}</td><td>${esc(t.operador)}</td><td>${esc(t.camion)}</td><td>${esc(t.tipo)}</td><td>${esc(t.clasificacion)}</td></tr>`);html+=`</tbody></table></div>`;if(mov.length>150)html+=`<div style="font-size:9px;color:#94a3b8;margin-top:8px">Mostrando 150 de ${fmt(mov.length)} movimientos. El concentrado superior incluye el total completo.</div>`;} else html+=`<div class="gm-empty">Sin registros.</div>`;
    html+=`</div>`;
    setModal('Movimientos no core','Detalle y concentración de todos los movimientos que NO son Exportación, Importación ni Foráneo.',html);
  }

  function detallePrioridad(trips){
    const pendientes=(typeof pendingListData!=='undefined'?pendingListData:[]).length;const trans=(typeof transitoListData!=='undefined'?transitoListData:[]).length;const vac=trips.filter(t=>t.isVacio).length;const total=trips.length;const clientes={};trips.forEach(t=>clientes[t.cliente]=(clientes[t.cliente]||0)+1);const top=Object.entries(clientes).sort((a,b)=>b[1]-a[1])[0];
    const items=[];if(pendientes)items.push(['Atender pendientes','Liberar/asignar servicios sin salida registrada.',Math.min(100,40+pendientes)]);if(trans)items.push(['Revisar tránsito','Dar seguimiento a servicios sin llegada registrada.',Math.min(100,35+trans)]);if(top&&pct(top[1],total)>=30)items.push(['Monitorear concentración',`${top[0]} concentra ${pct(top[1],total).toFixed(1)}% del volumen.`,Math.min(100,25+pct(top[1],total))]);if(vac&&pct(vac,total)>=20)items.push(['Reducir vacíos',`${fmt(vac)} servicios son vacíos (${pct(vac,total).toFixed(1)}%).`,Math.min(100,20+pct(vac,total))]);if(!items.length)items.push(['Mantener operación','No se detectan focos prioritarios con los datos disponibles.',10]);items.sort((a,b)=>b[2]-a[2]);
    let html=`<div class="gm-detail-card"><h3>🎯 Orden sugerido de atención</h3>`;items.forEach((x,i)=>html+=`<div class="gm-priority-row"><div class="gm-priority-rank">${i+1}</div><div><strong>${esc(x[0])}</strong><p>${esc(x[1])}</p></div><div class="gm-priority-score">${Math.round(x[2])}/100</div></div>`);html+=`<p style="font-size:9px;color:#94a3b8;margin-top:12px">La prioridad es una regla analítica del tablero, no una orden automática. Se recomienda validar contexto operativo antes de ejecutar acciones.</p></div><div class="gm-action"><button onclick="cerrarPanelGerencialInteractivo();document.getElementById('pendientesSection')?.scrollIntoView({behavior:'smooth'})">Ir a pendientes</button><button class="secondary" onclick="cerrarPanelGerencialInteractivo();document.getElementById('transitoSection')?.scrollIntoView({behavior:'smooth'})">Ir a tránsito</button></div>`;
    setModal('Qué hacer primero','Orden de atención sugerido según impacto operativo observado en el periodo.',html);
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape')cerrarPanelGerencialInteractivo();});
  document.getElementById('gmInteractiveModal')?.addEventListener('click',e=>{if(e.target.id==='gmInteractiveModal')cerrarPanelGerencialInteractivo();});
})();
