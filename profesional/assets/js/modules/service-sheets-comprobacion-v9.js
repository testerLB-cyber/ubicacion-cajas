/* Tráfico App Profesional · Hojas de Servicio · Comprobación manual v9 */
(function(){
  if(window.__hsCompV9)return;window.__hsCompV9=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  let busy=false;
  const today=()=>new Date().toISOString().slice(0,10);
  function opts(xs,label){return (xs||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc(label(x))+'</option>').join('')}
  async function load(){const r=await sb().rpc('hs_list');if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo cargar Hojas');return r.data}
  function modal(title,html,onSave){const o=document.createElement('div');o.style='position:fixed;inset:0;background:rgba(15,23,42,.78);z-index:101200;display:flex;align-items:center;justify-content:center;padding:16px';o.innerHTML='<div style="background:white;width:min(860px,97vw);max-height:94vh;overflow:auto;border-radius:16px"><div style="background:#0f172a;color:white;padding:15px 18px;display:flex;justify-content:space-between"><strong>'+esc(title)+'</strong><button type="button" data-x style="border:0;background:none;color:white;font-size:22px">×</button></div><form style="padding:18px">'+html+'<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:15px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar comprobación</button></div></form></div>';document.body.appendChild(o);const close=()=>o.remove();o.querySelector('[data-x]').onclick=close;o.querySelector('[data-cancel]').onclick=close;o.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.currentTarget.querySelector('[type=submit]');b.disabled=true;try{await onSave(new FormData(e.currentTarget));close()}catch(err){alert(err.message||err);b.disabled=false}};return o}
  async function openManual(folioId){
    if(busy)return;busy=true;try{const D=await load(),f=(D.foliosAsignadosOperador||[]).find(x=>x.id===folioId);if(!f)return alert('La hoja ya no está pendiente de comprobar.');const clientes=D.clientes||[];if(!clientes.length)return alert('No hay clientes activos.');
      const persona=f.tipoPersona==='BENEFICIARIO'?(f.beneficiario||'—'):(f.operador||'—');
      modal('Comprobar '+f.folio,'<div style="padding:12px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin-bottom:14px"><strong>'+esc(f.folio)+'</strong><div style="font-size:11px;color:#475569;margin-top:4px">Persona: '+esc(persona)+' · Responsable: '+esc(f.responsable||'—')+'</div><div style="font-size:10px;color:#1d4ed8;margin-top:5px">La fecha y hora de comprobación se registran automáticamente al guardar.</div></div><div class="cc-grid"><div class="cc-field"><label>Fecha de uso de la hoja *</label><input type="date" name="fechaUso" value="'+today()+'" required></div><div class="cc-field"><label>Cliente *</label><select name="clienteId" required><option value="">Seleccionar…</option>'+opts(clientes,x=>x.nombre)+'</select></div><div class="cc-field"><label>Tipo de viaje *</label><input name="tipoViaje" placeholder="Ej. Exportación, Importación, Cruce, Foráneo" required></div><div class="cc-field"><label>Clasificación *</label><input name="clasificacion" placeholder="Ej. Cargado, Vacío, Movimiento" required></div></div><div class="cc-field"><label>Observaciones</label><textarea name="observaciones" placeholder="Opcional"></textarea></div>',async fd=>{
        const r=await sb().rpc('hs_mark_used',{p_item:{folioId:f.id,fechaUso:fd.get('fechaUso'),clienteId:fd.get('clienteId'),tipoViaje:fd.get('tipoViaje'),clasificacion:fd.get('clasificacion'),servicio:fd.get('tipoViaje'),observaciones:fd.get('observaciones')}});if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo comprobar');alert('Hoja '+r.data.folio+' comprobada.');document.dispatchEvent(new CustomEvent('hs:comprobacion-actualizada'));setTimeout(()=>document.querySelector('#ccPanelHojasServicio [data-hsv="Comprobacion"]')?.click(),180)
      });
    }catch(e){alert(e.message||e)}finally{busy=false}
  }
  async function renderHistory(){
    const body=document.getElementById('hsCompHistBody');if(!body)return;try{const D=await load(),rows=D.comprobaciones||[],table=body.closest('table'),th=table?.querySelector('thead tr');if(th)th.innerHTML='<th>FOLIO</th><th>FECHA COMPROBACIÓN</th><th>FECHA USO</th><th>TIPO VIAJE</th><th>CLASIFICACIÓN</th><th>CLIENTE</th><th>OPERADOR / PERSONA</th>';
      body.innerHTML=rows.length?rows.map(x=>'<tr><td><strong>'+esc(x.folio)+'</strong></td><td>'+esc(x.fechaComprobacion?new Date(x.fechaComprobacion).toLocaleString('es-MX'):'—')+'</td><td>'+esc(x.fechaUso||'—')+'</td><td>'+esc(x.tipoViaje||'—')+'</td><td>'+esc(x.clasificacion||'—')+'</td><td>'+esc(x.cliente||'—')+'</td><td>'+esc(x.beneficiario||x.operador||'—')+'</td></tr>').join(''):'<tr><td colspan="7" style="text-align:center;padding:20px">Sin comprobaciones registradas.</td></tr>';
    }catch(e){console.warn('HS v9 history',e)}
  }
  function install(){
    document.addEventListener('click',e=>{
      const b=e.target.closest?.('#ccPanelHojasServicio [data-comprobar],#ccPanelHojasServicio [data-hs-use]');if(b){const id=b.closest('[data-row]')?.dataset.row||b.dataset.hsUse;if(id){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openManual(id)}}
      if(e.target.closest?.('#ccPanelHojasServicio [data-hsv="Comprobacion"]'))setTimeout(renderHistory,700)
    },true);
    document.addEventListener('hs:comprobacion-actualizada',()=>setTimeout(renderHistory,350));
    setTimeout(renderHistory,1800);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
