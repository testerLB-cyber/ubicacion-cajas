/* Tráfico App Profesional · Hojas · asignar desde cualquier custodia aceptada v2 */
(function(){
  'use strict';
  if(window.__HS_ANY_ACCEPTED_CUSTODY_V2__)return;
  window.__HS_ANY_ACCEPTED_CUSTODY_V2__=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const norm=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
  const active=xs=>(xs||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
  const perm=()=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('hojas_servicio.asignar_operador'));
  async function rpc(name,args){const r=await sb().rpc(name,args||{});if(r.error)throw r.error;if(r.data?.ok===false)throw new Error(r.data.error||'No se pudo completar');return r.data}
  function modal(html){
    document.getElementById('hsAnyCustodyModal')?.remove();
    const ov=document.createElement('div');ov.id='hsAnyCustodyModal';
    ov.style='position:fixed;inset:0;background:rgba(15,23,42,.74);z-index:2147483200;display:flex;align-items:center;justify-content:center;padding:14px';
    ov.innerHTML='<div style="width:min(820px,97vw);max-height:94vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 24px 70px #0f172a55"><div style="background:#0f172a;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center"><div><strong>Asignar hojas a persona</strong><div style="font-size:10px;color:#cbd5e1;margin-top:3px">Selecciona Serie / Año. La custodia se detecta automáticamente entre las aceptadas.</div></div><button type="button" data-x style="border:0;background:none;color:#fff;font-size:23px">×</button></div><div style="padding:16px">'+html+'</div></div>';
    document.body.appendChild(ov);ov.querySelector('[data-x]').onclick=()=>ov.remove();ov.addEventListener('click',e=>{if(e.target===ov)ov.remove()});return ov;
  }
  function conflictText(xs){
    const rows=Array.isArray(xs)?xs:[];
    return rows.map(x=>String(x.consecutivo??'').padStart(5,'0')+' ['+(x.estatus||'NO DISPONIBLE')+']'+(x.responsable?' · '+x.responsable:'')+(x.persona?' · '+x.persona:'')).join(', ');
  }
  async function open(){
    if(!perm())return alert('Sin permiso para asignar hojas.');
    if(!sb())return alert('Supabase no está disponible.');
    let d;try{d=await rpc('hs_list');try{const b=await rpc('cc_hojas_beneficiarios_web');d.beneficiarios=Array.isArray(b)?b:[]}catch(_){d.beneficiarios=[]}}catch(e){return alert(e.message||e)}
    const aa=(d.asignacionesResponsable||[]).filter(x=>String(x.estatus||'').toUpperCase()==='ACEPTADA');
    if(!aa.length)return alert('No hay hojas en custodias aceptadas disponibles.');

    const acceptedCombos=[];const seenCombos=new Set();
    aa.forEach(a=>{const ser=(d.series||[]).find(x=>String(x.codigo)===String(a.serie));const yr=(d.anios||[]).find(x=>String(x.anio)===String(a.anio));if(!ser||!yr)return;const k=String(ser.id)+'|'+String(yr.id);if(seenCombos.has(k))return;seenCombos.add(k);acceptedCombos.push({serieId:String(ser.id),anioId:String(yr.id),serie:String(a.serie),anio:String(a.anio)});});
    if(!acceptedCombos.length)return alert('No hay Serie / Año con custodias aceptadas disponibles.');
    const body='<form id="hsAnyCustodyForm">'+
      '<div class="hs104-grid">'+
        '<div class="cc-field"><label>Tipo *</label><select name="tipoPersona"><option value="OPERADOR">Operador</option><option value="BENEFICIARIO">Beneficiario</option></select></div>'+
        '<div class="cc-field"><label>Operador / Beneficiario *</label><div style="display:flex;gap:6px;align-items:center"><input name="personaNombre" type="search" autocomplete="off" placeholder="Escribe mínimo 3 letras..." style="flex:1" required><button type="button" class="cc-btn cc-btn-light" data-person-more title="Buscar en catálogo">...</button></div><input name="personaId" type="hidden"><div class="cc-note" data-person-status>Escribe mínimo 3 letras o usa … para buscar.</div></div>'+
        '<div class="cc-field"><label>Serie / Año *</label><select name="serieAnio" required><option value="">Seleccionar…</option>'+acceptedCombos.map(x=>'<option value="'+esc(x.serieId+'|'+x.anioId)+'">'+esc(x.serie+' · '+x.anio)+'</option>').join('')+'</select><div class="cc-note">Solo se muestran Series/Años que tienen hojas en custodias aceptadas.</div></div>'+
        '<div class="cc-field"><label>Forma de asignación *</label><select name="modo"><option value="RANGO">Por rango</option><option value="INDIVIDUAL">Hoja individual</option><option value="VARIOS">Varias hojas</option></select></div>'+
      '</div>'+
      '<div data-mode="RANGO" class="hs104-grid" style="margin-top:10px"><div class="cc-field"><label>Desde *</label><input name="desde" inputmode="numeric" maxlength="5" placeholder="5 dígitos"></div><div class="cc-field"><label>Hasta *</label><input name="hasta" inputmode="numeric" maxlength="5" placeholder="5 dígitos"></div></div>'+
      '<div data-mode="INDIVIDUAL" style="display:none;margin-top:10px"><div class="cc-field"><label>Hoja individual *</label><input name="individual" inputmode="numeric" maxlength="5" placeholder="5 dígitos"></div></div>'+
      '<div data-mode="VARIOS" style="display:none;margin-top:10px"><div class="cc-field"><label>Varias hojas *</label><input name="varios" inputmode="numeric" placeholder="5 dígitos + coma o Enter"><div class="cc-note">Cada hoja se valida y queda como etiqueta. Puedes quitarla con ×.</div></div><div data-chips style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"></div></div>'+
      '<div data-status class="cc-note" style="margin:10px 0">Captura las hojas para validar disponibilidad.</div>'+
      '<div class="cc-field"><label>Observaciones</label><textarea name="observaciones"></textarea></div>'+
      '<div class="hs104-actions"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Validar y asignar hojas</button></div>'+
    '</form>';

    const ov=modal(body),f=ov.querySelector('#hsAnyCustodyForm');
    const status=ov.querySelector('[data-status]'),chips=ov.querySelector('[data-chips]'),personInput=f.personaNombre,personId=f.personaId,personStatus=ov.querySelector('[data-person-status]');
    f.__set=new Set();

    const people=()=>f.tipoPersona.value==='BENEFICIARIO'?active(d.beneficiarios):active(d.operadores);
    const personLabel=x=>String(x.nombre||'')+(x.numeroEmpleado?' · '+x.numeroEmpleado:'')+(x.email?' · '+x.email:'');
    const choosePerson=x=>{personId.value=String(x.id);personInput.value=personLabel(x);personStatus.textContent='✓ '+personLabel(x);personStatus.style.color='#15803d';};
    const clearPerson=()=>{personId.value='';personInput.value='';personStatus.textContent='Escribe mínimo 3 letras o usa … para buscar.';personStatus.style.color='#64748b';};
    const syncPerson=()=>{
      const q=norm(personInput.value),xs=people();
      if(q.length<3){personId.value='';personStatus.textContent='Escribe mínimo 3 letras o usa … para buscar.';personStatus.style.color='#64748b';return;}
      let m=xs.find(x=>norm(personLabel(x))===q)||xs.find(x=>norm(x.nombre)===q);
      const hits=xs.filter(x=>norm(personLabel(x)).includes(q)||norm(x.nombre).includes(q));
      if(!m&&hits.length===1)m=hits[0];
      personId.value=m?String(m.id):'';
      if(m) personInput.value=personLabel(m);
      personStatus.textContent=m?'✓ '+personLabel(m):(hits.length?hits.length+' coincidencia(s). Usa … para seleccionar.':'Sin coincidencias.');
      personStatus.style.color=m?'#15803d':(hits.length?'#64748b':'#b91c1c');
    };
    const openPicker=()=>{
      document.getElementById('hsAnyPersonPicker')?.remove();
      const po=document.createElement('div');po.id='hsAnyPersonPicker';po.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:2147483300;display:flex;align-items:center;justify-content:center;padding:14px';
      po.innerHTML='<div style="width:min(680px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:14px"><div style="padding:13px 15px;background:#0f172a;color:#fff;display:flex;justify-content:space-between"><strong>Buscar '+(f.tipoPersona.value==='BENEFICIARIO'?'beneficiario':'operador')+'</strong><button type="button" data-x style="border:0;background:none;color:#fff;font-size:24px">×</button></div><div style="padding:14px"><input data-q class="cc-input" type="search" placeholder="Escribe mínimo 3 letras..." style="width:100%;margin-bottom:10px"><div data-list></div></div></div>';
      document.body.appendChild(po);const q=po.querySelector('[data-q]'),list=po.querySelector('[data-list]'),close=()=>po.remove();
      const paint=()=>{const n=norm(q.value),xs=people().filter(x=>n.length<3||norm(personLabel(x)).includes(n)||norm(x.nombre).includes(n));list.innerHTML=xs.length?xs.slice(0,100).map(x=>'<button type="button" class="cc-btn cc-btn-light" data-id="'+esc(x.id)+'" style="display:block;width:100%;text-align:left;margin:5px 0">'+esc(personLabel(x))+'</button>').join(''):'<div class="cc-note">Sin coincidencias.</div>';list.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{const x=people().find(z=>String(z.id)===String(b.dataset.id));if(x){choosePerson(x);close();}});};
      q.oninput=paint;po.querySelector('[data-x]').onclick=close;po.onclick=e=>{if(e.target===po)close()};paint();q.focus();
    };

    const selectedItem=()=>{
      const modo=f.modo.value,item={modo};
      const parts=String(f.serieAnio.value||'').split('|');
      item.serieId=parts[0]||'';item.anioId=parts[1]||'';
      if(!item.serieId||!item.anioId)throw new Error('Selecciona Serie / Año.');
      if(modo==='RANGO'){
        const ds=String(f.desde.value||''),hs=String(f.hasta.value||'');
        if(!/^\d{5}$/.test(ds)||!/^\d{5}$/.test(hs))throw new Error('Desde y Hasta deben tener exactamente 5 dígitos.');
        item.desde=Number(ds);item.hasta=Number(hs);if(item.hasta<item.desde)throw new Error('Hasta no puede ser menor que Desde.');
      }else if(modo==='INDIVIDUAL'){
        const n=String(f.individual.value||'');if(!/^\d{5}$/.test(n))throw new Error('La hoja individual debe tener exactamente 5 dígitos.');item.individual=Number(n);
      }else{
        const vals=[...f.__set];if(!vals.length)throw new Error('Agrega al menos una hoja.');item.folios=vals.map(Number);
      }
      return item;
    };
    let seq=0;
    const validate=async()=>{
      const my=++seq;
      try{
        const item=selectedItem();status.textContent='Validando disponibilidad…';status.style.color='#64748b';
        const r=await rpc('hs_validate_person_selection_any_custody',{p_item:item});
        if(my!==seq)return;
        if(r.available){status.textContent='✓ '+Number(r.total||0)+' hoja(s) disponibles.';status.style.color='#15803d';}
        else{status.textContent='✕ '+conflictText(r.conflicts);status.style.color='#b91c1c';}
      }catch(e){if(my!==seq)return;status.textContent=e.message||e;status.style.color='#b91c1c';}
    };
    const renderChips=()=>{chips.innerHTML=[...f.__set].map(n=>'<span style="display:inline-flex;align-items:center;gap:7px;background:#e2e8f0;border-radius:999px;padding:6px 10px;font-weight:800">'+esc(n)+'<button type="button" data-chip="'+esc(n)+'" style="border:0;background:transparent;cursor:pointer;font-size:16px">×</button></span>').join('');chips.querySelectorAll('[data-chip]').forEach(b=>b.onclick=()=>{f.__set.delete(String(b.dataset.chip));renderChips();validate();});};
    const processMulti=()=>{const parts=String(f.varios.value||'').split(/[\s,]+/).filter(Boolean);if(!parts.length)return;f.varios.value='';for(const p of parts){const n=String(p).replace(/\D/g,'');if(n.length!==5){status.textContent='El folio '+p+' debe tener exactamente 5 dígitos.';status.style.color='#b91c1c';return;}f.__set.add(n);}renderChips();validate();};

    f.tipoPersona.onchange=clearPerson;personInput.oninput=syncPerson;personInput.onchange=syncPerson;personInput.onblur=syncPerson;personInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();syncPerson();}});ov.querySelector('[data-person-more]').onclick=openPicker;
    f.modo.onchange=()=>{ov.querySelectorAll('[data-mode]').forEach(x=>x.style.display=x.dataset.mode===f.modo.value?'':'none');f.__set.clear();renderChips();['desde','hasta','individual','varios'].forEach(n=>{if(f[n])f[n].value='';});status.textContent='Captura las hojas para validar disponibilidad.';status.style.color='#64748b';};
    ['desde','hasta','individual'].forEach(n=>f[n]?.addEventListener('input',()=>{f[n].value=f[n].value.replace(/\D/g,'').slice(0,5);if(f[n].value.length===5)validate();}));
    f.varios.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===','){e.preventDefault();processMulti();}});
    f.varios.addEventListener('input',()=>{f.varios.value=f.varios.value.replace(/[^0-9,\s]/g,'');if(/^\d{5}$/.test(f.varios.value.trim()))processMulti();});
    f.serieAnio.onchange=()=>{f.__set.clear();renderChips();['desde','hasta','individual','varios'].forEach(n=>{if(f[n])f[n].value='';});status.textContent='Captura las hojas para validar disponibilidad entre todas las custodias aceptadas de esa Serie / Año.';status.style.color='#64748b';};
    ov.querySelector('[data-cancel]').onclick=()=>ov.remove();

    f.onsubmit=async e=>{
      e.preventDefault();const btn=f.querySelector('[type=submit]');btn.disabled=true;
      try{
        if(!personId.value)throw new Error('Selecciona un operador o beneficiario válido.');
        const item=selectedItem();
        item.tipoPersona=f.tipoPersona.value;item.personaId=personId.value;item.operadorId=personId.value;item.observaciones=f.observaciones.value;
        const check=await rpc('hs_validate_person_selection_any_custody',{p_item:item});
        if(!check.available)throw new Error('No se puede asignar. '+conflictText(check.conflicts));
        const r=await rpc('hs_assign_person_selection_any_custody',{p_item:item});
        alert('Hojas asignadas: '+Number(r.asignados||0)+' · '+(r.persona||''));ov.remove();if(typeof window.ccHsOpen==='function')window.ccHsOpen();
      }catch(err){alert(err.message||err);btn.disabled=false}
    };
    clearPerson();
  }
  document.addEventListener('click',e=>{const b=e.target.closest?.('#hs104AssignOp');if(!b)return;e.preventDefault();e.stopImmediatePropagation();open()},true);
})();