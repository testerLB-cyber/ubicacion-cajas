/* Tráfico App Profesional · Flujo simplificado de cierre y comprobantes de anticipos */
(function(){
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const date=v=>v?new Date(v).toLocaleDateString('es-MX'):'—';
  const sb=()=>window.gmSupabase;

  function ocultarPendientesConfirmar(){
    const btn=document.querySelector('.cc-ant-nav [data-antv="confirmar"]');
    if(btn) btn.style.display='none';
    const view=document.getElementById('ccAntViewConfirmar');
    if(view) view.style.display='none';
  }

  function tieneComprobacion(a){
    return !!a && (String(a.estatus||'').toUpperCase()==='PENDIENTE_CONFIRMAR' || Number(a.comprobado||0)>0);
  }

  async function cargarDatos(){
    const r=await sb().rpc('cc_ant_list');
    if(r&&r.error) throw r.error;
    if(!r?.data?.ok) throw new Error(r?.data?.error||'No se pudieron cargar comprobantes');
    return r.data;
  }

  function cerrarModal(id){document.getElementById(id)?.remove()}

  async function editarComprobante(a,c){
    if(['CERRADO','CANCELADO'].includes(String(a.estatus||'').toUpperCase())){
      alert('El anticipo debe estar abierto para editar comprobantes.');return;
    }
    cerrarModal('ccProfCompEdit');
    const ov=document.createElement('div');ov.id='ccProfCompEdit';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.75);z-index:100003;display:flex;align-items:center;justify-content:center;padding:18px';
    const fecha=String(c.fecha||'').slice(0,10);
    ov.innerHTML='<div style="background:#fff;width:min(650px,96vw);border-radius:16px;overflow:hidden"><div style="padding:15px 18px;background:#4c1d95;color:#fff;display:flex;justify-content:space-between"><strong>Editar comprobante</strong><button id="ccProfCompEditX" style="background:none;border:0;color:#fff;font-size:22px">×</button></div><form id="ccProfCompEditForm" style="padding:18px"><div class="cc-grid"><div class="cc-field"><label>Fecha *</label><input name="fecha" type="date" required value="'+esc(fecha)+'"></div><div class="cc-field"><label>Concepto *</label><input name="concepto" required value="'+esc(c.concepto||'')+'"></div><div class="cc-field"><label>Tipo documento</label><input name="tipoDocumento" value="'+esc(c.tipo_documento||'')+'"></div><div class="cc-field"><label>Folio documento</label><input name="folioDocumento" value="'+esc(c.folio_documento||'')+'"></div><div class="cc-field"><label>Monto *</label><input name="monto" type="number" min="0.01" step="0.01" required value="'+Number(c.monto||0)+'"></div><div class="cc-field"><label>URL evidencia</label><input name="evidenciaUrl" value="'+esc(c.evidencia_url||'')+'"></div></div><div class="cc-field" style="margin-top:10px"><label>Observaciones</label><textarea name="observaciones">'+esc(c.observaciones||'')+'</textarea></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="cc-btn cc-btn-light" id="ccProfCompEditCancel">Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar cambios</button></div></form></div>';
    document.body.appendChild(ov);
    const close=()=>ov.remove();ov.querySelector('#ccProfCompEditX').onclick=close;ov.querySelector('#ccProfCompEditCancel').onclick=close;
    ov.querySelector('#ccProfCompEditForm').onsubmit=async ev=>{
      ev.preventDefault();const fd=new FormData(ev.currentTarget);const btn=ev.currentTarget.querySelector('button[type=submit]');btn.disabled=true;
      try{
        const item={id:c.id,fecha:new Date(String(fd.get('fecha'))+'T12:00:00').toISOString(),concepto:String(fd.get('concepto')||''),tipoDocumento:String(fd.get('tipoDocumento')||''),folioDocumento:String(fd.get('folioDocumento')||''),monto:Number(fd.get('monto')||0),evidenciaUrl:String(fd.get('evidenciaUrl')||''),observaciones:String(fd.get('observaciones')||'')};
        const r=await sb().rpc('cc_ant_update_comprobacion',{p_item:item});if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo actualizar');
        close();await window.ccAntLoad?.(true);await verComprobantes(a.id);
      }catch(e){alert(e.message||e);btn.disabled=false}
    };
  }

  async function eliminarComprobante(a,c){
    if(['CERRADO','CANCELADO'].includes(String(a.estatus||'').toUpperCase())){alert('El anticipo debe estar abierto para eliminar comprobantes.');return}
    if(!confirm('¿Eliminar este comprobante de '+money(c.monto)+'? El registro se conservará en historial como cancelado.'))return;
    const motivo=prompt('Motivo de eliminación:','Corrección de comprobante')||'Corrección de comprobante';
    try{
      const r=await sb().rpc('cc_ant_delete_comprobacion',{p_id:c.id,p_motivo:motivo});if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo eliminar');
      await window.ccAntLoad?.(true);await verComprobantes(a.id);
    }catch(e){alert(e.message||e)}
  }

  async function verComprobantes(anticipoId){
    try{
      const d=await cargarDatos();
      const a=(d.anticipos||[]).find(x=>x.id===anticipoId);if(!a)throw new Error('Anticipo no encontrado');
      const comps=(d.comprobaciones||[]).filter(x=>x.anticipo_id===anticipoId&&String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
      cerrarModal('ccProfCompModal');
      const ov=document.createElement('div');ov.id='ccProfCompModal';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.75);z-index:100002;display:flex;align-items:center;justify-content:center;padding:18px';
      const editable=!['CERRADO','CANCELADO'].includes(String(a.estatus||'').toUpperCase()) && (typeof window.ccPerm!=='function'||window.ccPerm('anticipos.editar'));
      const rows=comps.length?comps.map(c=>'<tr><td>'+date(c.fecha)+'</td><td><strong>'+esc(c.concepto||'Comprobante')+'</strong><div style="font-size:9px;color:#64748b">'+esc(c.observaciones||'')+'</div></td><td>'+esc(c.tipo_documento||'—')+'</td><td>'+esc(c.folio_documento||'—')+'</td><td><strong>'+money(c.monto)+'</strong></td><td>'+(c.evidencia_url?'<a href="'+esc(c.evidencia_url)+'" target="_blank" rel="noopener" class="cc-btn cc-btn-light">Ver archivo</a>':'—')+'</td><td>'+(editable?'<button class="cc-btn cc-btn-light" data-prof-comp-edit="'+esc(c.id)+'"><i class="fa-solid fa-pen mr-1"></i>Editar</button> <button class="cc-btn cc-btn-danger" data-prof-comp-del="'+esc(c.id)+'"><i class="fa-solid fa-trash mr-1"></i>Eliminar</button>':'Solo lectura')+'</td></tr>').join(''):'<tr><td colspan="7" style="padding:24px;text-align:center;color:#94a3b8">No hay comprobantes activos.</td></tr>';
      ov.innerHTML='<div style="background:#fff;width:min(1050px,97vw);max-height:92vh;overflow:auto;border-radius:16px"><div style="padding:15px 18px;background:#4c1d95;color:#fff;display:flex;justify-content:space-between"><div><strong>Comprobantes · '+esc(a.folio||'')+'</strong><div style="font-size:10px;color:#ddd6fe">'+esc(a.operador||'')+' · '+esc(a.destino||'')+'</div></div><button id="ccProfCompX" style="background:none;border:0;color:#fff;font-size:22px">×</button></div><div style="padding:18px"><div class="cc-config-alert" style="margin-bottom:12px"><strong>Entregado:</strong> '+money(a.montoEntregado||0)+' · <strong>Comprobado:</strong> '+money(a.comprobado||0)+' · <strong>Pendiente:</strong> '+money(a.pendiente||0)+(editable?'':'<br><span style="color:#92400e">Anticipo cerrado/cancelado: comprobantes en modo solo lectura.</span>')+'</div><div class="cc-inv-wrap" style="max-height:58vh;overflow:auto"><table class="cc-ant-table"><thead><tr><th>FECHA</th><th>CONCEPTO</th><th>TIPO</th><th>FOLIO</th><th>MONTO</th><th>EVIDENCIA</th><th>ACCIONES</th></tr></thead><tbody>'+rows+'</tbody></table></div><div style="text-align:right;margin-top:14px"><button class="cc-btn cc-btn-primary" id="ccProfCompClose">Cerrar</button></div></div></div>';
      document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('#ccProfCompX').onclick=close;ov.querySelector('#ccProfCompClose').onclick=close;
      ov.onclick=ev=>{const eb=ev.target.closest('[data-prof-comp-edit]'),db=ev.target.closest('[data-prof-comp-del]');if(eb){const c=comps.find(x=>x.id===eb.dataset.profCompEdit);if(c)editarComprobante(a,c)}if(db){const c=comps.find(x=>x.id===db.dataset.profCompDel);if(c)eliminarComprobante(a,c)}};
    }catch(e){alert(e.message||e)}
  }
  window.ccProfVerComprobantes=verComprobantes;

  function mejorarListado(){
    ocultarPendientesConfirmar();
    const body=document.getElementById('ccAntBody');
    const rows=Array.from(body?.querySelectorAll('tr')||[]);
    const data=Array.isArray(window.ccAntFiltered)?window.ccAntFiltered:[];
    rows.forEach((tr,i)=>{
      const a=data[i];if(!a||!tieneComprobacion(a))return;
      const estado=String(a.estatus||'').toUpperCase();
      if(!['CERRADO','CANCELADO'].includes(estado)){
        tr.style.background='#fef3c7';tr.style.boxShadow='inset 4px 0 0 #f59e0b';tr.dataset.comprobacionLista='1';
      }
      const actions=tr.lastElementChild?.querySelector('div')||tr.lastElementChild;if(!actions)return;
      if(!actions.querySelector('[data-prof-comp-view]')){
        const v=document.createElement('button');v.type='button';v.className='cc-btn';v.style.background='#7c3aed';v.style.color='#fff';v.dataset.profCompView=a.id;v.innerHTML='<i class="fa-solid fa-receipt mr-1"></i>Ver comprobantes';v.onclick=ev=>{ev.preventDefault();ev.stopPropagation();verComprobantes(a.id)};actions.appendChild(v);
      }
      if(!['CERRADO','CANCELADO'].includes(estado)&&!actions.querySelector('[data-ant-close-main]')){
        const b=document.createElement('button');b.type='button';b.className='cc-btn cc-btn-primary';b.dataset.antCloseMain=a.id;b.innerHTML='<i class="fa-solid fa-circle-check mr-1"></i>Cerrar anticipo';b.title='Finalizar este anticipo usando sus comprobaciones registradas';b.onclick=ev=>{ev.preventDefault();ev.stopPropagation();if(typeof window.ccAntCerrar==='function')window.ccAntCerrar(a.id)};actions.appendChild(b);
      }
    });
  }

  function instalar(){
    ocultarPendientesConfirmar();
    if(typeof window.ccAntRender!=='function')return;
    if(window.ccAntRender.__profCierreEnListado)return;
    const original=window.ccAntRender;
    const wrapped=function(){const r=original.apply(this,arguments);mejorarListado();return r};
    wrapped.__profCierreEnListado=true;window.ccAntRender=wrapped;mejorarListado();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(instalar,0));else setTimeout(instalar,0);
})();
