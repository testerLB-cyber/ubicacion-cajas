  head.innerHTML=`<tr>
    <th>#</th><th>UNIDAD</th><th>DESCRIPCIÓN</th><th>CLIENTE</th><th>RESPONSABLE</th><th>FECHA INICIO</th><th>FECHA FIN</th><th>MÉTODO</th><th>ESTATUS</th><th>ACCIÓN</th>
  </tr>`;

  body.innerHTML=rows.length?rows.map((r,i)=>{
    const unidad=cajaMap.get(r.cajaId),cli=cliMap.get(r.clienteId),resp=respMap.get(r.responsableId);
    const activa=r.estatus!=='FINALIZADA'&&r.estatus!=='CANCELADA';
    const vencida=!!(activa&&r.indeterminada!=='SI'&&r.fechaFin&&r.fechaFin<hoy);
    const fechaFin=activa?((r.indeterminada==='SI'||!r.fechaFin)?'Indeterminada':r.fechaFin):(r.fechaFin||'—');
    return `<tr>
      <td>${i+1}</td>
      <td><strong>${esc(unidad?.numero||'—')}</strong></td>
      <td>${esc(unidad?.descripcion||'—')}</td>
      <td>${esc(cli?.nombre||'—')}</td>
      <td>${esc(resp?.nombre||'—')}</td>
      <td>${esc(r.fechaInicio||'—')}</td>
      <td>${esc(fechaFin||'—')}</td>
      <td>${esc(r.metodoCobro||'—')}</td>
      <td><span class="cc-badge ${activa&&!vencida?'cc-ok':''}" ${vencida?'style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa"':''}>${activa?(vencida?'VENCIDA · EN RENTA':'ACTIVA'):'FINALIZADA'}</span></td>
      <td>${activa?`<div style="display:flex;gap:5px;flex-wrap:nowrap"><button class="cc-btn cc-btn-light cc-renta-edit-btn" onclick="ccNuevaRenta('${r.id}')"><i class="fa-solid fa-pen mr-1"></i>Editar</button><button class="cc-btn cc-btn-danger cc-renta-exit-btn" onclick="ccSacarDeRenta('${r.id}')"><i class="fa-solid fa-arrow-right-from-bracket mr-1"></i>Sacar de renta</button></div>`:'<span class="cc-note">Histórico</span>'}</td>
    </tr>`;
  }).join(''):`<tr><td colspan="10" style="padding:24px;text-align:center;color:#94a3b8">No hay rentas activas con los filtros seleccionados.</td></tr>`;

  const unidadesTipo=cajas.filter(x=>tipoUnidad==='TODOS'||String(x.categoriaUnidad||x.tipoUnidadNombre||'CAJA').toUpperCase()===String(tipoUnidad).toUpperCase());
  const activasFiltradas=rentas.filter(r=>{
    const unidad=cajaMap.get(r.cajaId);
    const tipoOk=tipoUnidad==='TODOS'||String(unidad?.categoriaUnidad||unidad?.tipoUnidadNombre||'CAJA').toUpperCase()===String(tipoUnidad).toUpperCase();
    return tipoOk&&r.estatus!=='FINALIZADA'&&r.estatus!=='CANCELADA'&&(!responsableId||r.responsableId===responsableId)&&(!clienteId||r.clienteId===clienteId);
  });
  const histVisible=!!document.getElementById('ccRentaMostrarHistorico')?.checked;
  document.getElementById('ccRentaSummary').innerHTML=`
    <div class="cc-card"><small>Rentas activas</small><strong style="display:block;font-size:20px">${activasFiltradas.length}</strong></div>
    <div class="cc-card"><small>Clientes activos</small><strong style="display:block;font-size:20px">${new Set(activasFiltradas.map(r=>r.clienteId).filter(Boolean)).size}</strong></div>
    <div class="cc-card"><small>Histórico</small><strong style="display:block;font-size:20px">${histVisible?'Visible':'Oculto'}</strong></div>
    <div class="cc-card"><small>Disponibles</small><strong style="display:block;font-size:20px;color:#b91c1c">${Math.max(0,unidadesTipo.filter(x=>x.estatus!=='MANTENIMIENTO'&&x.estatus!=='INACTIVO').length-activasFiltradas.length)}</strong></div>`;
};window.ccToggleRentaHistorico=function(){var panel=document.getElementById('ccRentaHistoricoPanel'),ck=document.getElementById('ccRentaMostrarHistorico');if(!panel||!ck)return;panel.style.display=ck.checked?'block':'none';if(ck.checked)ccRenderRentaHistorico();ccRenderRenta();};
window.ccRenderRentaHistorico=function(){
  const panel=document.getElementById('ccRentaHistoricoPanel'),body=document.getElementById('ccRentaHistBody');
  if(!panel||panel.style.display==='none'||!body)return;
  const cajaSel=document.getElementById('ccRentaHistCaja'),cliSel=document.getElementById('ccRentaHistCliente'),respSel=document.getElementById('ccRentaHistResponsable');
  const curCaja=cajaSel?.value||'',curCli=cliSel?.value||'',curResp=respSel?.value||'';
  if(cajaSel){cajaSel.innerHTML='<option value="">Todas</option>'+cajas.map(x=>`<option value="${x.id}">${esc(x.numero||'Sin número')}</option>`).join('');cajaSel.value=curCaja;}
  if(cliSel){cliSel.innerHTML='<option value="">Todos</option>'+clientes.map(x=>`<option value="${x.id}">${esc(x.nombre)}</option>`).join('');cliSel.value=curCli;}
  if(respSel){respSel.innerHTML='<option value="">Todos</option>'+responsables.map(x=>`<option value="${x.id}">${esc(x.nombre)}</option>`).join('');respSel.value=curResp;}
  const cajaId=cajaSel?.value||'',clienteId=cliSel?.value||'',responsableId=respSel?.value||'',desde=document.getElementById('ccRentaHistDesde')?.value||'',hasta=document.getElementById('ccRentaHistHasta')?.value||'';
  const cajaMap=new Map(cajas.map(x=>[x.id,x])),cliMap=new Map(clientes.map(x=>[x.id,x])),respMap=new Map(responsables.map(x=>[x.id,x]));
  const rows=rentas.filter(r=>{
    if(r.estatus==='CANCELADA')return false;
    const finalizada=r.estatus==='FINALIZADA'||(r.fechaFin&&r.indeterminada!=='SI');
    if(!finalizada)return false;
    if(cajaId&&r.cajaId!==cajaId)return false;
    if(clienteId&&r.clienteId!==clienteId)return false;
    if(responsableId&&r.responsableId!==responsableId)return false;
    const inicio=String(r.fechaInicio||''),fin=String(r.fechaFin||'');
    if(desde&&fin&&fin<desde)return false;
    if(hasta&&inicio&&inicio>hasta)return false;
    return true;
  }).map(r=>{
    const inicio=String(r.fechaInicio||''),fin=String(r.fechaFin||'');
    const a=desde&&desde>inicio?desde:inicio,b=hasta&&hasta<fin?hasta:fin;
    const dias=(a&&b&&a<=b)?Math.floor((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/86400000)+1:0;
    return {r,unidad:cajaMap.get(r.cajaId),cliente:cliMap.get(r.clienteId),responsable:respMap.get(r.responsableId),dias};
  }).sort((a,b)=>String(b.r.fechaFin||b.r.fechaInicio||'').localeCompare(String(a.r.fechaFin||a.r.fechaInicio||'')));
  const k=document.getElementById('ccRentaHistKpis');
  if(k)k.innerHTML=`<div class="cc-card"><small>Registros históricos</small><strong style="display:block;font-size:20px">${rows.length}</strong></div><div class="cc-card"><small>Cajas</small><strong style="display:block;font-size:20px">${new Set(rows.map(x=>x.r.cajaId)).size}</strong></div><div class="cc-card"><small>Clientes</small><strong style="display:block;font-size:20px">${new Set(rows.map(x=>x.r.clienteId)).size}</strong></div><div class="cc-card"><small>Días en rango</small><strong style="display:block;font-size:20px">${rows.reduce((s,x)=>s+x.dias,0)}</strong></div>`;
  body.innerHTML=rows.length?rows.map(x=>`<tr><td><strong>${esc(x.unidad?.numero||'—')}</strong></td><td>${esc(x.cliente?.nombre||'—')}</td><td>${esc(x.responsable?.nombre||'—')}</td><td>${esc(x.r.fechaInicio||'—')}</td><td>${esc(x.r.fechaFin||'—')}</td><td>${x.dias}</td><td>${esc(x.r.metodoCobro||'DIARIO')}</td><td>${esc(x.r.observaciones||'—')}</td></tr>`).join(''):'<tr><td colspan="8" style="padding:24px;text-align:center;color:#94a3b8">Sin rentas históricas con los filtros seleccionados.</td></tr>';
  window.ccRentaHistoricoData=rows;
};
window.ccRentaHistoricoLimpiar=function(){['ccRentaHistCaja','ccRentaHistCliente','ccRentaHistResponsable','ccRentaHistDesde','ccRentaHistHasta'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});ccRenderRentaHistorico();};
function ccHistDays(desde,hasta){if(!desde||!hasta||desde>hasta)return 0;const a=new Date(desde+'T12:00:00'),b=new Date(hasta+'T12:00:00');return Math.floor((b-a)/86400000)+1;}
function ccHistOverlapDays(r,desde,hasta){
  const hoy=iso(new Date());
  let inicio=String(r.fechaInicio||'');
  let fin=(r.indeterminada==='SI'||!r.fechaFin)?hoy:String(r.fechaFin||'');
  if(!inicio)return 0;

  // Si no hay rango seleccionado, utiliza únicamente el periodo real de la renta.
  const desdeReal=desde&&desde!=='0000-01-01'?desde:inicio;
  const hastaReal=hasta&&hasta!=='9999-12-31'?hasta:hoy;

  let a=inicio>desdeReal?inicio:desdeReal;
  let b=fin<hastaReal?fin:hastaReal;
  if(a>b)return 0;

  const da=new Date(a+'T12:00:00');
  const db=new Date(b+'T12:00:00');
  return Math.max(0,Math.floor((db-da)/86400000)+1);
}
let ccHistRenderTimer=null;
window.ccRenderHistorialDebounced=function(){
  clearTimeout(ccHistRenderTimer);
  ccHistRenderTimer=setTimeout(()=>ccRenderHistorial(),80);
};
window.ccRenderHistorial=function(){
 const boxSel=document.getElementById('ccHistCaja'),cliSel=document.getElementById('ccHistCliente'),respSel=document.getElementById('ccHistResponsable'),body=document.getElementById('ccHistBody');
 if(!boxSel||!cliSel||!respSel||!body)return;
 const bc=boxSel.value||'',cl=cliSel.value||'',rp=respSel.value||'';
 const key=`${cajas.length}|${clientes.length}`;
 if(window.ccHistCatalogKey!==key){
   const oldB=bc,oldC=cl;
   boxSel.innerHTML='<option value="">Todas las cajas</option>'+cajas.map(x=>`<option value="${x.id}">${esc(x.numero||'Sin número')} — ${esc(x.descripcion||'')}</option>`).join('');
   cliSel.innerHTML='<option value="">Todos los clientes</option>'+clientes.map(x=>`<option value="${x.id}">${esc(x.nombre)}</option>`).join('');
   respSel.innerHTML='<option value="">Todos los responsables</option>'+responsables.map(x=>`<option value="${x.id}">${esc(x.nombre)}</option>`).join('');
   boxSel.value=oldB;cliSel.value=oldC;window.ccHistCatalogKey=key;
 }
 const cajaMap=new Map(cajas.map(x=>[x.id,x])),clienteMap=new Map(clientes.map(x=>[x.id,x])),respMap=new Map(responsables.map(x=>[x.id,x]));
 const rows=rentas.filter(r=>{
   if(r.estatus==='CANCELADA')return false;
   if(bc&&r.cajaId!==bc)return false;
   if(cl&&r.clienteId!==cl)return false;
   if(rp&&r.responsableId!==rp)return false;
   return true;
 }).map(r=>{
   const abierta=r.indeterminada==='SI'||!r.fechaFin;
   return {
     entrada:r.fechaInicio||'—',
     salida:abierta?'ABIERTA':(r.fechaFin||'—'),
     caja:cajaMap.get(r.cajaId)?.numero||'—',
     cliente:clienteMap.get(r.clienteId)?.nombre||'Sin cliente',
     responsable:respMap.get(r.responsableId)?.nombre||'Sin responsable',
     estatus:abierta?'ACTIVA':'FINALIZADA',
     observaciones:r.observaciones||''
   };
 }).sort((a,b)=>String(b.entrada).localeCompare(String(a.entrada)));

