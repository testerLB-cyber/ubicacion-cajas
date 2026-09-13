/* Tráfico App · Anticipos · catálogo/configuración v9 */
(function(){
  'use strict';
  if(window.__ANT_FINAL_CLEANUP_V9__) return;
  window.__ANT_FINAL_CLEANUP_V9__=true;

  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const sb=()=>window.gmSupabase;
  const canCatalog=()=>typeof window.ccPerm==='function' ? !!window.ccPerm('anticipos.catalogos') : false;

  function cleanup(){
    document.querySelectorAll('[data-aa="links"]').forEach(el=>el.remove());
    document.querySelectorAll('button,a,[role="button"]').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(/^Enlaces$/i.test(t)||/\bQR\b|c[oó]digo\s*qr|comprobar\s*por\s*qr/i.test(t)) el.remove();
    });
    const list=document.getElementById('ccAntCatTiposAnticipo');
    const card=list?.closest('.cc-config-card');
    if(card){
      const title=card.querySelector('.cc-toolbar strong');
      if(title&&title.textContent!=='Tipos de unidad (desde Configuración · CARRO)') title.textContent='Tipos de unidad (desde Configuración · CARRO)';
      const add=card.querySelector('button[onclick*="TIPO_UNIDAD_ANTICIPO"]');
      if(add) add.remove();
      let note=card.querySelector('[data-ant-unit-source-note]');
      if(!note){
        note=document.createElement('div');note.dataset.antUnitSourceNote='1';note.className='cc-note';note.style.marginTop='6px';
        note.textContent='Este listado se alimenta automáticamente de Configuración > Tipos de unidad y solo muestra tipos clasificados como CARRO.';
        card.querySelector('.cc-toolbar')?.insertAdjacentElement('afterend',note);
      }
    }
    scheduleEnhance();
  }

  const oldCatalogForm=window.ccAntCatalogoForm;
  if(typeof oldCatalogForm==='function'){
    window.ccAntCatalogoForm=function(t){
      if(t==='TIPO_UNIDAD_ANTICIPO'){
        alert('Los tipos de unidad para Anticipos se administran en Configuración > Tipos de unidad. Solo se usan los clasificados como CARRO.');
        return;
      }
      return oldCatalogForm.apply(this,arguments);
    };
  }

  window.ccAntConfigDestino=async function(){
    if(!canCatalog()) return;
    const s=sb();if(!s){alert('Supabase no está disponible.');return;}
    try{
      const [rd,rt,rc]=await Promise.all([
        s.from('cc_ant_destinos').select('id,nombre,estatus').eq('estatus','ACTIVO').order('nombre'),
        s.from('cc_tipos_unidad').select('id,nombre,categoria,estatus').eq('estatus','ACTIVO').eq('categoria','CARRO').order('nombre'),
        s.from('cc_ant_conceptos').select('id,nombre,categoria,estatus').eq('estatus','ACTIVO').order('nombre')
      ]);
      if(rd.error)throw rd.error;if(rt.error)throw rt.error;if(rc.error)throw rc.error;
      const destinos=rd.data||[],tipos=rt.data||[],conceptos=rc.data||[];
      if(!destinos.length)throw new Error('No hay destinos activos.');
      if(!tipos.length)throw new Error('No hay tipos de unidad CARRO activos.');
      if(!conceptos.length)throw new Error('No hay conceptos activos.');

      document.getElementById('ccAntDestinoMultiModal')?.remove();
      const ov=document.createElement('div');ov.id='ccAntDestinoMultiModal';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.74);z-index:100500;display:flex;align-items:center;justify-content:center;padding:18px';
      ov.innerHTML='<div style="background:#fff;width:min(900px,97vw);max-height:94vh;overflow:auto;border-radius:16px"><div style="padding:15px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between"><div><strong>Configuración por destino</strong><div style="font-size:10px;color:#cbd5e1">Agrega varios conceptos y guárdalos juntos. Los marcados como Precargar se cargarán al crear el anticipo.</div></div><button type="button" data-close style="background:none;border:0;color:#fff;font-size:22px">×</button></div><div style="padding:18px"><div class="cc-grid"><div class="cc-field"><label>Destino *</label><select id="antCfgDestino">'+destinos.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')+'</select></div><div class="cc-field"><label>Tipo de unidad *</label><select id="antCfgTipo">'+tipos.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nombre)+'</option>').join('')+'</select></div></div><div class="cc-note" style="margin:8px 0 12px">Puedes autorizar varios conceptos para el mismo destino. Marca <b>Precargar</b> en los que deban aparecer automáticamente en un anticipo.</div><div id="antCfgRows"></div><button type="button" class="cc-btn cc-btn-light" id="antCfgAdd" style="margin-top:10px">+ Agregar concepto</button><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="cc-btn cc-btn-light" data-close>Cancelar</button><button type="button" class="cc-btn cc-btn-primary" id="antCfgSave">Guardar configuración</button></div></div></div>';
      document.body.appendChild(ov);
      const rowsBox=ov.querySelector('#antCfgRows'),destSel=ov.querySelector('#antCfgDestino'),tipoSel=ov.querySelector('#antCfgTipo');
      const close=()=>ov.remove();ov.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
      function rowHtml(x){x=x||{};return '<div class="ant-cfg-row" style="display:grid;grid-template-columns:minmax(220px,1fr) 150px 120px 44px;gap:8px;align-items:end;padding:10px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px"><div class="cc-field"><label>Concepto</label><select data-concepto>'+conceptos.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===x.concepto_id?'selected':'')+'>'+esc(c.nombre)+'</option>').join('')+'</select></div><div class="cc-field"><label>Monto</label><input data-monto type="number" min="0" step="0.01" value="'+esc(x.monto==null?'0':x.monto)+'"></div><label style="display:flex;gap:6px;align-items:center;padding-bottom:9px"><input data-default type="checkbox" '+(x.es_default!==false?'checked':'')+'> Precargar</label><button type="button" class="cc-btn cc-btn-danger" data-del title="Quitar">×</button></div>';}
      function bindDeletes(){rowsBox.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>b.closest('.ant-cfg-row')?.remove());}
      async function loadRows(){
        rowsBox.innerHTML='<div class="cc-note">Cargando configuración...</div>';
        const r=await s.from('cc_ant_destino_conceptos').select('id,concepto_id,monto,es_default,estatus').eq('destino_id',destSel.value).eq('tipo_unidad_id',tipoSel.value).eq('estatus','ACTIVO').order('created_at');
        if(r.error)throw r.error;const arr=r.data||[];rowsBox.innerHTML=arr.length?arr.map(rowHtml).join(''):rowHtml({es_default:true,monto:0});bindDeletes();
      }
      destSel.onchange=()=>loadRows().catch(e=>alert(e.message||e));tipoSel.onchange=()=>loadRows().catch(e=>alert(e.message||e));
      ov.querySelector('#antCfgAdd').onclick=()=>{rowsBox.insertAdjacentHTML('beforeend',rowHtml({es_default:true,monto:0}));bindDeletes();};
      ov.querySelector('#antCfgSave').onclick=async function(){
        const btn=this;btn.disabled=true;btn.textContent='Guardando...';
        try{
          const items=[...rowsBox.querySelectorAll('.ant-cfg-row')].map(r=>({conceptoId:r.querySelector('[data-concepto]').value,monto:Number(r.querySelector('[data-monto]').value||0),esDefault:r.querySelector('[data-default]').checked}));
          const ids=items.map(x=>x.conceptoId);if(new Set(ids).size!==ids.length)throw new Error('No puedes repetir el mismo concepto en el mismo destino.');
          const res=await s.rpc('cc_ant_save_destination_config',{p_destino_id:destSel.value,p_tipo_unidad_id:tipoSel.value,p_items:items});
          if(res.error)throw res.error;if(!res.data?.ok)throw new Error('No se pudo guardar la configuración.');
          alert('Configuración guardada. '+Number(res.data.conceptosGuardados||0)+' concepto(s) autorizados.');close();
          if(typeof window.ccAntLoad==='function')await window.ccAntLoad(true);else scheduleEnhance();
        }catch(e){alert('No se pudo guardar.\n\n'+(e.message||e));btn.disabled=false;btn.textContent='Guardar configuración';}
      };
      await loadRows();
    }catch(e){alert('No se pudo abrir Configuración por destino.\n\n'+(e.message||e));}
  };

  const specs={
    ccAntCatOperadores:{tipo:'OPERADOR',table:'cc_ant_operadores',fields:'id,nombre,numero_empleado,telefono,estatus',secondary:x=>[x.numero_empleado,x.telefono].filter(Boolean).join(' · '),form:x=>'<div class="cc-field"><label>Nombre *</label><input name="nombre" required value="'+esc(x.nombre||'')+'"></div><div class="cc-field"><label>Número empleado</label><input name="numeroEmpleado" value="'+esc(x.numero_empleado||'')+'"></div><div class="cc-field"><label>Teléfono</label><input name="telefono" value="'+esc(x.telefono||'')+'"></div>'},
    ccAntCatConceptos:{tipo:'CONCEPTO',table:'cc_ant_conceptos',fields:'id,nombre,categoria,requiere_comprobante,estatus',secondary:x=>x.categoria||'',form:x=>'<div class="cc-field"><label>Nombre *</label><input name="nombre" required value="'+esc(x.nombre||'')+'"></div><div class="cc-field"><label>Categoría</label><select name="categoria">'+['CASETAS','ALIMENTOS','HOTEL','COMBUSTIBLE','OTRO'].map(v=>'<option '+(v===x.categoria?'selected':'')+'>'+v+'</option>').join('')+'</select></div>'},
    ccAntCatCuentas:{tipo:'CUENTA',table:'cc_ant_cuentas',fields:'id,nombre,tipo,saldo_inicial,estatus',secondary:x=>(x.tipo||'')+' · Saldo inicial '+money(x.saldo_inicial),form:x=>'<div class="cc-field"><label>Nombre *</label><input name="nombre" required value="'+esc(x.nombre||'')+'"></div><div class="cc-field"><label>Tipo</label><select name="tipo"><option '+(x.tipo==='CAJA'?'selected':'')+'>CAJA</option><option '+(x.tipo==='BANCO'?'selected':'')+'>BANCO</option></select></div><div class="cc-field"><label>Saldo inicial</label><input name="saldoInicial" type="number" step="0.01" value="'+esc(x.saldo_inicial||0)+'"></div>'},
    ccAntCatDestinos:{tipo:'DESTINO',table:'cc_ant_destinos',fields:'id,nombre,descripcion,estatus',secondary:x=>x.descripcion||'',form:x=>'<div class="cc-field"><label>Destino *</label><input name="nombre" required value="'+esc(x.nombre||'')+'"></div><div class="cc-field"><label>Descripción</label><textarea name="descripcion">'+esc(x.descripcion||'')+'</textarea></div>'},
    ccAntCatMetodos:{tipo:'METODO_DEPOSITO',table:'cc_ant_metodos_deposito',fields:'id,nombre,descripcion,estatus',secondary:x=>x.descripcion||'',form:x=>'<div class="cc-field"><label>Método *</label><input name="nombre" required value="'+esc(x.nombre||'')+'"></div><div class="cc-field"><label>Descripción</label><textarea name="descripcion">'+esc(x.descripcion||'')+'</textarea></div>'},
    ccAntCatTiposMovCaja:{tipo:'TIPO_MOV_CAJA',table:'cc_ant_tipos_movimiento_caja',fields:'id,codigo,nombre,naturaleza,descripcion,sistema,estatus',secondary:x=>(x.naturaleza||'')+' · '+(x.descripcion||x.codigo||'')+(x.sistema?' · SISTEMA':''),form:x=>'<div class="cc-field"><label>Nombre *</label><input name="nombre" required value="'+esc(x.nombre||'')+'"></div><div class="cc-field"><label>Clave</label><input name="codigo" value="'+esc(x.codigo||'')+'"></div><div class="cc-field"><label>Movimiento *</label><select name="naturaleza"><option value="ENTRADA" '+(x.naturaleza==='ENTRADA'?'selected':'')+'>ENTRADA</option><option value="SALIDA" '+(x.naturaleza==='SALIDA'?'selected':'')+'>SALIDA</option></select></div><div class="cc-field"><label>Descripción</label><textarea name="descripcion">'+esc(x.descripcion||'')+'</textarea></div>'}
  };

  async function openCatalogEdit(spec,x){
    if(!canCatalog())return;
    document.getElementById('ccAntCatalogEditModal')?.remove();
    const ov=document.createElement('div');ov.id='ccAntCatalogEditModal';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.74);z-index:100600;display:flex;align-items:center;justify-content:center;padding:18px';
    ov.innerHTML='<div style="background:#fff;width:min(620px,96vw);max-height:92vh;overflow:auto;border-radius:16px"><div style="padding:15px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between"><strong>Editar catálogo</strong><button data-close style="background:none;border:0;color:#fff;font-size:22px">×</button></div><form style="padding:18px">'+spec.form(x)+'<div class="cc-field"><label>Estatus</label><select name="estatus"><option value="ACTIVO" '+(x.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option value="INACTIVO" '+(x.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div><div class="cc-note">Inactivar no elimina históricos; solo evita usar el registro en nuevas operaciones.</div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-close>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar cambios</button></div></form></div>';
    document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
    ov.querySelector('form').onsubmit=async e=>{
      e.preventDefault();const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;
      try{
        const fd=new FormData(e.currentTarget),item=Object.fromEntries(fd.entries());item.id=x.id;item.requiereComprobante=x.requiere_comprobante!==false;
        const r=await sb().rpc('cc_ant_save_catalog',{p_tipo:spec.tipo,p_item:item});if(r.error)throw r.error;close();
        if(typeof window.ccAntLoad==='function')await window.ccAntLoad(true);else scheduleEnhance();
      }catch(err){alert('No se pudo guardar.\n\n'+(err.message||err));btn.disabled=false;}
    };
  }

  async function setCatalogStatus(spec,x,status){
    if(!canCatalog())return;
    if(!confirm((status==='INACTIVO'?'¿Inactivar ':'¿Reactivar ')+(x.nombre||'este registro')+'?'))return;
    const item={id:x.id,nombre:x.nombre,estatus:status,numeroEmpleado:x.numero_empleado||'',telefono:x.telefono||'',categoria:x.categoria||'OTRO',requiereComprobante:x.requiere_comprobante!==false,tipo:x.tipo||'CAJA',saldoInicial:Number(x.saldo_inicial||0),descripcion:x.descripcion||'',codigo:x.codigo||'',naturaleza:x.naturaleza||'SALIDA'};
    const r=await sb().rpc('cc_ant_save_catalog',{p_tipo:spec.tipo,p_item:item});if(r.error){alert('No se pudo cambiar el estatus.\n\n'+r.error.message);return;}
    if(typeof window.ccAntLoad==='function')await window.ccAntLoad(true);else scheduleEnhance();
  }

  async function renderCatalogsManaged(){
    const s=sb();if(!s)return;
    for(const [id,spec] of Object.entries(specs)){
      const box=document.getElementById(id);if(!box)continue;
      const r=await s.from(spec.table).select(spec.fields).order('nombre');if(r.error)continue;
      const data=r.data||[];const sig=JSON.stringify(data.map(x=>[x.id,x.nombre,x.estatus,x.updated_at]));
      if(box.dataset.managedSig===sig)continue;box.dataset.managedSig=sig;
      box.innerHTML=data.length?data.map(x=>'<div style="padding:8px 4px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:10px"><div style="min-width:0"><strong>'+esc(x.nombre||'')+'</strong><small style="display:block;color:#64748b">'+esc(spec.secondary(x))+' · '+esc(x.estatus||'ACTIVO')+'</small></div>'+(canCatalog()?'<div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end"><button class="cc-btn cc-btn-light" data-cat-edit="'+esc(x.id)+'">Editar</button><button class="cc-btn '+(x.estatus==='INACTIVO'?'cc-btn-primary':'cc-btn-light')+'" data-cat-status="'+esc(x.id)+'" data-next="'+(x.estatus==='INACTIVO'?'ACTIVO':'INACTIVO')+'">'+(x.estatus==='INACTIVO'?'Reactivar':'Inactivar')+'</button></div>':'')+'</div>').join(''):'<div class="cc-note">Sin registros.</div>';
      box.onclick=e=>{const eb=e.target.closest('[data-cat-edit]'),sbx=e.target.closest('[data-cat-status]');if(eb){const x=data.find(z=>String(z.id)===eb.dataset.catEdit);if(x)openCatalogEdit(spec,x);}if(sbx){const x=data.find(z=>String(z.id)===sbx.dataset.catStatus);if(x)setCatalogStatus(spec,x,sbx.dataset.next);}};
    }
  }

  async function renderGroupedDestinationConfig(){
    const box=document.getElementById('ccAntCatDestinoConceptos'),s=sb();if(!box||!s)return;
    const [rCfg,rDest,rType,rCon]=await Promise.all([
      s.from('cc_ant_destino_conceptos').select('id,destino_id,concepto_id,tipo_unidad_id,monto,es_default,estatus').eq('estatus','ACTIVO'),
      s.from('cc_ant_destinos').select('id,nombre'),
      s.from('cc_tipos_unidad').select('id,nombre'),
      s.from('cc_ant_conceptos').select('id,nombre')
    ]);if(rCfg.error||rDest.error||rType.error||rCon.error)return;
    const dm=Object.fromEntries((rDest.data||[]).map(x=>[x.id,x.nombre])),tm=Object.fromEntries((rType.data||[]).map(x=>[x.id,x.nombre])),cm=Object.fromEntries((rCon.data||[]).map(x=>[x.id,x.nombre]));
    const groups=new Map();(rCfg.data||[]).filter(x=>x.tipo_unidad_id).forEach(x=>{const k=x.destino_id+'|'+x.tipo_unidad_id;if(!groups.has(k))groups.set(k,{destinoId:x.destino_id,tipoId:x.tipo_unidad_id,items:[]});groups.get(k).items.push(x);});
    const arr=[...groups.values()].sort((a,b)=>String(dm[a.destinoId]||'').localeCompare(String(dm[b.destinoId]||'')));
    const sig=JSON.stringify(arr.map(g=>[g.destinoId,g.tipoId,g.items.map(i=>[i.id,i.monto,i.es_default]) ]));if(box.dataset.groupSig===sig)return;box.dataset.groupSig=sig;
    box.innerHTML=arr.length?arr.map(g=>{const defs=g.items.filter(i=>i.es_default),opts=g.items.filter(i=>!i.es_default);return '<div style="padding:10px 8px;border-bottom:1px solid #e2e8f0"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><strong>'+esc(dm[g.destinoId]||'Destino')+'</strong><div style="font-size:10px;color:#64748b">'+esc(tm[g.tipoId]||'Tipo')+'</div></div><span class="cc-badge">'+defs.length+' por default</span></div><div style="margin-top:7px">'+(defs.length?defs.map(i=>'<div style="font-size:11px;padding:3px 0"><b>'+esc(cm[i.concepto_id]||'Concepto')+'</b> · '+money(i.monto)+' <span style="color:#16a34a">PRECARGA</span></div>').join(''):'<div class="cc-note">Sin conceptos marcados para precarga.</div>')+(opts.length?'<div style="font-size:10px;color:#64748b;margin-top:5px">Opcionales autorizados: '+opts.map(i=>esc(cm[i.concepto_id]||'')).join(', ')+'</div>':'')+'</div></div>';}).join(''):'<div class="cc-note">Sin configuración por destino.</div>';
  }

  let enhancing=false,pending=false;
  async function enhance(){if(enhancing){pending=true;return;}enhancing=true;try{await Promise.all([renderCatalogsManaged(),renderGroupedDestinationConfig()]);}finally{enhancing=false;if(pending){pending=false;setTimeout(enhance,100);}}}
  function scheduleEnhance(){clearTimeout(scheduleEnhance.t);scheduleEnhance.t=setTimeout(enhance,120);}

  if(typeof window.ccAntLoad==='function'){
    const oldLoad=window.ccAntLoad;window.ccAntLoad=async function(){const r=await oldLoad.apply(this,arguments);scheduleEnhance();return r;};
  }
  const mo=new MutationObserver(cleanup);mo.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>{cleanup();scheduleEnhance();},150);
})();
