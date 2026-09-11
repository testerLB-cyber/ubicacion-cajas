      await ccAudit({
        operacionId:ccAuditId('MANT'),
        accion:'LIBERACION_MANTENIMIENTO',
        modulo:'MANTENIMIENTO',
        submodulo:'LIBERACION',
        idRegistro:recordActual.id||'',
        idUnidad:x.id,
        numeroUnidad:x.numero||'',
        idMantenimiento:recordActual.id||'',
        estatusAnterior:'MANTENIMIENTO',
        estatusNuevo:'ACTIVO',
        datosNuevos:recordActual,
        detalle:'Reparación realizada: '+reparacion+(evidenciaLiberacionUrl?' | Evidencia de liberación adjunta':'')
      });

      showStatus?.('UNIDAD LIBERADA · Generando PDF y enviando correo...','success');
      await ccGenerarPDFMantenimiento(recordActual,unidadActual);
      const mail=await ccEnviarAvisoMantenimiento(unidadActual,recordActual,'LIBERACION');
      if(mail?.ok)showStatus?.('UNIDAD LIBERADA · CORREO DE LIBERACIÓN ENVIADO','success');
      else showStatus?.('UNIDAD LIBERADA · No se pudo enviar el correo de liberación','error');
    }catch(err){
      console.error('ERROR LIBERANDO MANTENIMIENTO:',err);
      showStatus?.('ERROR: no se pudo liberar mantenimiento · '+(err.message||err),'error');
      alert('No se pudo liberar la unidad:\n'+(err.message||err));
      if(btn){btn.disabled=false;btn.textContent='Liberar unidad';}
    }
  };
};

window.ccRenderMantenimiento=function(){
  const body=document.getElementById('ccMaintenanceBody');
  const hist=document.getElementById('ccMaintenanceHistoryBody');
  const badge=document.getElementById('ccMaintenanceBadge');
  const activos=cajas.filter(x=>x.estatus==='MANTENIMIENTO');
  if(badge)badge.textContent=activos.length+' en mantenimiento';
  const sel=document.getElementById('ccMantUnidad');
  if(sel){const cur=sel.value;sel.innerHTML='<option value="">Todas las unidades</option>'+cajas.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.numero||x.descripcion||'UNIDAD')+'</option>').join('');sel.value=cur;}
  if(body){
    body.innerHTML=activos.length?activos.map((x,i)=>{
      const rec=(configuracion.mantenimientoHistorial||[]).find(r=>r.cajaId===x.id&&!r.fechaLiberacion)||(configuracion.mantenimientoHistorial||[]).find(r=>r.id===x.mantenimientoRecordId);
      const fecha=rec?.fechaSalida?new Date(rec.fechaSalida).toLocaleString('es-MX'):'—';const acciones=[];
      if(ccPerm('mantenimiento.editar_registros')||ccPerm('inventario.mantenimiento'))acciones.push('<button class="cc-btn cc-btn-primary" onclick="ccLiberarMantenimiento(\''+x.id+'\')">Liberar</button>');
      if(rec)acciones.push('<button class="cc-btn cc-btn-light" onclick="ccGenerarPDFMantenimientoById(\''+rec.id+'\')">PDF</button>');
      return '<tr><td>'+(i+1)+'</td><td><strong>'+esc(x.numero||'—')+'</strong></td><td>'+esc(x.descripcion||'—')+'</td><td><span class="cc-badge cc-status-mant">MANTENIMIENTO</span></td><td>'+esc(fecha)+'</td><td>'+esc(rec?.motivo||x.mantenimientoMotivo||'—')+'</td><td>—</td><td>'+((acciones.join(' '))||'—')+'</td></tr>';
    }).join(''):'<tr><td colspan="8" style="padding:28px;text-align:center;color:#94a3b8">No hay unidades en mantenimiento.</td></tr>';
  }
  if(hist){
    const desde=document.getElementById('ccMantDesde')?.value||'',hasta=document.getElementById('ccMantHasta')?.value||'',unidad=document.getElementById('ccMantUnidad')?.value||'';
    const registros=[...(configuracion.mantenimientoHistorial||[])].filter(r=>{const fecha=String(r.fechaSalida||'').slice(0,10);if(desde&&fecha<desde)return false;if(hasta&&fecha>hasta)return false;if(unidad&&r.cajaId!==unidad)return false;return true;});
    window.ccMaintenanceFiltered=registros;
    hist.innerHTML=registros.length?registros.map((r,i)=>{
      const fs=r.fechaSalida?new Date(r.fechaSalida).toLocaleString('es-MX'):'—',fl=r.fechaLiberacion?new Date(r.fechaLiberacion).toLocaleString('es-MX'):'—',ev=[];
      if(r.evidenciaUrl)ev.push('<a class="cc-btn cc-btn-light" target="_blank" rel="noopener" href="'+esc(r.evidenciaUrl)+'"><i class="fa-solid fa-image"></i> Entrada</a>');
      if(r.evidenciaLiberacionUrl)ev.push('<a class="cc-btn cc-btn-light" target="_blank" rel="noopener" href="'+esc(r.evidenciaLiberacionUrl)+'"><i class="fa-solid fa-image"></i> Liberación</a>');
      const actions=['<button class="cc-btn cc-btn-light" onclick="ccGenerarPDFMantenimientoById(\''+r.id+'\')">PDF</button>'];
      if(ccPerm('mantenimiento.editar_registros'))actions.unshift('<button class="cc-btn cc-btn-light" onclick="ccEditarMantenimientoRegistro(\''+r.id+'\')"><i class="fa-solid fa-pen"></i> Editar</button>');
      return '<tr><td>'+(i+1)+'</td><td><strong>'+esc(r.numero||'—')+'</strong></td><td>'+esc(fs)+'</td><td>'+esc(r.motivo||'—')+'<div style="font-size:9px;color:#64748b;margin-top:4px">Reparación: '+esc(r.reparacion||'Pendiente')+'</div></td><td>'+esc(fl)+'</td><td><span class="cc-badge '+(r.fechaLiberacion?'cc-ok':'cc-status-mant')+'">'+(r.fechaLiberacion?'LIBERADA':'MANTENIMIENTO')+'</span></td><td><div style="display:flex;gap:5px;flex-wrap:wrap">'+(ev.join(' ')||'—')+'</div></td><td><div style="display:flex;gap:5px;flex-wrap:wrap">'+actions.join(' ')+'</div></td></tr>';
    }).join(''):'<tr><td colspan="8" style="padding:28px;text-align:center;color:#94a3b8">Sin historial con los filtros seleccionados.</td></tr>';
  }
  const dotBtn=document.getElementById('ccBtnVistaDot');if(dotBtn)dotBtn.style.display=ccPerm('mantenimiento.ver_dot')?'':'none';
};


window.ccLimpiarFiltrosMantenimiento=function(){
  const d=document.getElementById('ccMantDesde'),h=document.getElementById('ccMantHasta'),u=document.getElementById('ccMantUnidad');
  if(d)d.value='';if(h)h.value='';if(u)u.value='';ccRenderMantenimiento();
};
window.ccMostrarMantenimientoHistorial=function(){
  const m=document.getElementById('ccMaintenanceView'),d=document.getElementById('ccDotSection');
  if(m)m.style.display='block';if(d)d.style.display='none';ccRenderMantenimiento();
};
window.ccEditarMantenimientoRegistro=function(id){
  if(!ccPerm('mantenimiento.editar_registros')){alert('Tu usuario no tiene permiso para editar mantenimiento.');return;}
  const r=(configuracion.mantenimientoHistorial||[]).find(x=>x.id===id);if(!r)return;
  const dt=function(v){if(!v)return '';const d=new Date(v),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());};
  document.getElementById('ccMantEditModal')?.remove();
  const ov=document.createElement('div');ov.id='ccMantEditModal';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px';
  ov.innerHTML='<div style="background:#fff;width:min(650px,96vw);border-radius:16px;overflow:hidden"><div style="padding:15px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between"><strong>EDITAR MANTENIMIENTO · '+esc(r.numero||'UNIDAD')+'</strong><button type="button" id="ccMantEditClose" style="background:none;border:0;color:#fff;font-size:22px">×</button></div><form id="ccMantEditForm" style="padding:18px"><div class="cc-grid"><div class="cc-field"><label>Fecha salida</label><input name="fechaSalida" type="datetime-local" value="'+esc(dt(r.fechaSalida))+'" required></div><div class="cc-field"><label>Fecha liberación</label><input name="fechaLiberacion" type="datetime-local" value="'+esc(dt(r.fechaLiberacion))+'"></div></div><div class="cc-field" style="margin-top:10px"><label>Motivo</label><textarea name="motivo" required>'+esc(r.motivo||'')+'</textarea></div><div class="cc-field" style="margin-top:10px"><label>Reparación</label><textarea name="reparacion">'+esc(r.reparacion||'')+'</textarea></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="cc-btn cc-btn-light" id="ccMantEditCancel">Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar cambios</button></div></form></div>';
  document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('#ccMantEditClose').onclick=close;ov.querySelector('#ccMantEditCancel').onclick=close;
  ov.querySelector('#ccMantEditForm').onsubmit=async function(e){e.preventDefault();const fd=new FormData(e.currentTarget),btn=e.currentTarget.querySelector('button[type=submit]');btn.disabled=true;
    try{const fs=String(fd.get('fechaSalida')||''),fl=String(fd.get('fechaLiberacion')||'');const res=await gmSupabase.rpc('cc_update_maintenance_record',{p_id:id,p_fecha_salida:fs?new Date(fs).toISOString():null,p_motivo:String(fd.get('motivo')||''),p_fecha_liberacion:fl?new Date(fl).toISOString():null,p_reparacion:String(fd.get('reparacion')||'')});if(res.error)throw res.error;if(res.data?.ok===false)throw new Error(res.data.error||'No se pudo actualizar');close();await ccReloadFromDatabase();ccRenderMantenimiento();showStatus?.('MANTENIMIENTO ACTUALIZADO','success');}
    catch(err){alert('No se pudo editar el registro. '+(err.message||err));btn.disabled=false;}
  };
};
window.ccGenerarPDFHistorialMantenimiento=async function(){
  const rows=Array.isArray(window.ccMaintenanceFiltered)?window.ccMaintenanceFiltered:[...(configuracion.mantenimientoHistorial||[])];
  if(!rows.length){alert('No hay registros de mantenimiento con los filtros seleccionados.');return;}
  if(!window.jspdf?.jsPDF){alert('La librería PDF no está disponible.');return;}
  try{
    const jsPDF=window.jspdf.jsPDF,doc=new jsPDF({unit:'mm',format:'letter'});let y=18;
    doc.setFillColor(15,23,42);doc.rect(0,0,216,28,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('HISTORIAL DE MANTENIMIENTO',14,12);doc.setFontSize(8);doc.setFont('helvetica','normal');doc.text(rows.length+' registro(s) · generado '+new Date().toLocaleString('es-MX'),14,19);y=36;
    for(let i=0;i<rows.length;i++){
      const r=rows[i];if(y>220){doc.addPage();y=18;}
      doc.autoTable({startY:y,theme:'grid',head:[['CAMPO','DETALLE']],body:[['Unidad',r.numero||'—'],['Fecha salida',r.fechaSalida?new Date(r.fechaSalida).toLocaleString('es-MX'):'—'],['Motivo',r.motivo||'—'],['Reparación',r.reparacion||'Pendiente'],['Fecha liberación',r.fechaLiberacion?new Date(r.fechaLiberacion).toLocaleString('es-MX'):'—'],['Estatus',r.fechaLiberacion?'LIBERADA':'MANTENIMIENTO']],styles:{fontSize:8,cellPadding:2.2,overflow:'linebreak'},headStyles:{fillColor:[30,41,59],textColor:255},columnStyles:{0:{cellWidth:42,fontStyle:'bold'},1:{cellWidth:140}},margin:{left:16,right:16}});
      y=doc.lastAutoTable.finalY+5;const evidencias=[{url:r.evidenciaUrl,t:'Evidencia de entrada'},{url:r.evidenciaLiberacionUrl,t:'Evidencia de liberación'}].filter(x=>x.url);
      for(const ev of evidencias){try{const img=await ccImageUrlToDataUrl(ev.url),props=doc.getImageProperties(img),ratio=Math.min(165/props.width,75/props.height),w=props.width*ratio,h=props.height*ratio;if(y+h+12>265){doc.addPage();y=18;}doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(51,65,85);doc.text(ev.t,18,y);y+=4;doc.addImage(img,props.fileType||'JPEG',18,y,w,h);y+=h+7;}catch(e){doc.setFontSize(7);doc.setTextColor(185,28,28);doc.text('No fue posible cargar una evidencia.',18,y);y+=6;}}
      y+=4;
    }
    const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFontSize(7);doc.setTextColor(100,116,139);doc.text('Página '+p+' de '+pages,177,272);}
    const desde=document.getElementById('ccMantDesde')?.value||'inicio',hasta=document.getElementById('ccMantHasta')?.value||'actual';doc.save('Historial_Mantenimiento_'+desde+'_a_'+hasta+'.pdf');showStatus?.('PDF DE MANTENIMIENTO GENERADO · '+rows.length+' registros','success');
  }catch(err){console.error('PDF HISTORIAL MANT:',err);alert('No se pudo generar el PDF. '+(err.message||err));}
};


