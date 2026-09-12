/* Tráfico App Profesional · Control de Hojas · filtros persona + comprobación v10.2 */
(function(){
  if(window.__hsControlV102)return; window.__hsControlV102=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const norm=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const fmt=v=>v?new Date(v).toLocaleString('es-MX'):'—';
  const today=()=>new Date().toISOString().slice(0,10);
  let D={};
  let filterComp='OPERADOR', filterEntregas='OPERADOR', filterFolios='OPERADOR';

  async function rpc(name,args){
    const c=sb(); if(!c)throw new Error('Supabase no está disponible.');
    const r=await c.rpc(name,args||{}); if(r.error)throw r.error;
    if(r.data?.ok===false)throw new Error(r.data.error||'No se pudo completar');
    return r.data;
  }
  async function load(){ D=(await rpc('hs_list'))||{}; renderAll(); return D; }
  function tipo(x){return String(x?.tipoPersona||x?.tipo_persona||'OPERADOR').toUpperCase()==='BENEFICIARIO'?'BENEFICIARIO':'OPERADOR'}
  function persona(x){return x?.beneficiario||x?.beneficiario_nombre||x?.operador||x?.operador_nombre||x?.persona||'—'}
  function options(xs,label,sel){return '<option value="">Seleccionar…</option>'+(xs||[]).map(x=>'<option value="'+esc(x.id)+'"'+(x.id===sel?' selected':'')+'>'+esc(label(x))+'</option>').join('')}
  function modal(id,title,html,width='960px'){
    document.getElementById(id)?.remove();
    const o=document.createElement('div');o.id=id;
    o.style='position:fixed;inset:0;background:rgba(15,23,42,.82);z-index:2147483500;display:flex;align-items:center;justify-content:center;padding:12px';
    o.innerHTML='<div style="background:#fff;width:min('+width+',98vw);max-height:96vh;overflow:auto;border-radius:18px"><div style="position:sticky;top:0;z-index:3;background:#0f172a;color:#fff;padding:15px 18px;display:flex;justify-content:space-between;align-items:center"><strong>'+esc(title)+'</strong><button type="button" data-x style="border:0;background:none;color:#fff;font-size:24px">×</button></div><div style="padding:18px">'+html+'</div></div>';
    document.body.appendChild(o);o.querySelector('[data-x]').onclick=()=>o.remove();return o;
  }
  function typeSelect(id,val){return '<select id="'+id+'" class="cc-input" style="min-width:180px"><option value="OPERADOR"'+(val==='OPERADOR'?' selected':'')+'>Operadores</option><option value="BENEFICIARIO"'+(val==='BENEFICIARIO'?' selected':'')+'>Beneficiarios</option></select>'}

  function ensureFilters(){
    const comp=document.getElementById('hsViewComprobacion');
    if(comp){
      const tb=comp.querySelector('.cc-toolbar');
      if(tb&&!document.getElementById('hsV102TipoComp')){
        const box=document.createElement('div');box.style='display:flex;gap:8px;align-items:center;flex-wrap:wrap';
        box.innerHTML='<label style="font-size:10px;font-weight:900;color:#475569">Ver / comprobar</label>'+typeSelect('hsV102TipoComp',filterComp);
        const actions=tb.querySelector('.cc-actions'); actions?.prepend(box);
        box.querySelector('select').onchange=e=>{filterComp=e.target.value;renderComprobacion()};
      }
      const manual=comp.querySelector('[data-hs-manual]');
      if(manual&&!manual.dataset.v102){manual.dataset.v102='1';manual.onclick=e=>{e.preventDefault();e.stopPropagation();openManual()}}
    }
    const op=document.getElementById('hsViewOperadores');
    if(op&&!document.getElementById('hsV102TipoEntregas')){
      const tb=op.querySelector('.cc-toolbar');const box=document.createElement('div');box.style='display:flex;gap:8px;align-items:center;margin-left:auto;margin-right:8px';box.innerHTML='<label style="font-size:10px;font-weight:900;color:#475569">Ver</label>'+typeSelect('hsV102TipoEntregas',filterEntregas);tb?.insertBefore(box,tb.querySelector('[data-op]')||null);box.querySelector('select').onchange=e=>{filterEntregas=e.target.value;renderEntregas()};
    }
    const fol=document.getElementById('hsViewFolios');
    if(fol&&!document.getElementById('hsV102TipoFolios')){
      const tb=fol.querySelector('.cc-toolbar');const box=document.createElement('div');box.style='display:flex;gap:8px;align-items:center;margin-left:auto;margin-right:8px';box.innerHTML='<label style="font-size:10px;font-weight:900;color:#475569">Ver asignados a</label>'+typeSelect('hsV102TipoFolios',filterFolios);tb?.insertBefore(box,tb.querySelector('[data-gen]')||null);box.querySelector('select').onchange=e=>{filterFolios=e.target.value;renderFolios()};
    }
  }

  function renderComprobacion(){
    ensureFilters();
    const pending=(D.foliosAsignadosOperador||[]).filter(x=>tipo(x)===filterComp);
    const k=document.getElementById('hsV101Kpis');if(k)k.innerHTML='<div class="cc-ant-kpi"><small>Pendientes '+(filterComp==='OPERADOR'?'operadores':'beneficiarios')+'</small><strong>'+pending.length+'</strong></div><div class="cc-ant-kpi"><small>Comprobadas</small><strong>'+Number((D.comprobaciones||[]).filter(x=>tipo(x)===filterComp).length)+'</strong></div>';
    const b=document.getElementById('hsV101Pending');if(b){b.innerHTML=pending.length?pending.map(x=>'<tr><td><strong>'+esc(x.folio)+'</strong></td><td>'+esc(persona(x))+'</td><td>'+esc(x.responsable||'—')+'</td><td>'+fmt(x.asignadoAt)+'</td><td><button class="cc-btn cc-btn-primary" data-v102-check="'+esc(x.id)+'">Comprobar</button></td></tr>').join(''):'<tr><td colspan="5" style="padding:20px;text-align:center">Sin hojas pendientes para '+(filterComp==='OPERADOR'?'operadores':'beneficiarios')+'.</td></tr>';b.querySelectorAll('[data-v102-check]').forEach(bt=>bt.onclick=()=>openManual(bt.dataset.v102Check));}
    const hist=(D.comprobaciones||[]).filter(x=>tipo(x)===filterComp),h=document.getElementById('hsV101Hist');if(h)h.innerHTML=hist.length?hist.map(x=>'<tr><td><strong>'+esc(x.folio)+'</strong></td><td>'+fmt(x.fechaComprobacion)+'</td><td>'+esc(x.fechaUso||'—')+'</td><td>'+esc(x.cliente||'—')+'</td><td>'+esc(persona(x))+'</td><td>'+esc(x.tipoViaje||x.servicio||'—')+'</td><td>'+esc(x.clasificacion||'—')+'</td></tr>').join(''):'<tr><td colspan="7" style="padding:20px;text-align:center">Sin comprobaciones de '+(filterComp==='OPERADOR'?'operadores':'beneficiarios')+'.</td></tr>';
  }

  function renderEntregas(){
    const body=document.getElementById('hsOpBody');if(!body)return;
    const rows=(D.asignacionesOperador||[]).filter(x=>tipo(x)===filterEntregas),th=body.closest('table')?.querySelector('thead tr');
    if(th)th.innerHTML='<th>FOLIO</th><th>TIPO</th><th>'+(filterEntregas==='OPERADOR'?'OPERADOR':'BENEFICIARIO')+'</th><th>RESPONSABLE</th><th>FECHA</th>';
    body.innerHTML=rows.length?rows.map(x=>'<tr><td><strong>'+esc(x.folio)+'</strong></td><td><span class="cc-badge">'+esc(tipo(x))+'</span></td><td>'+esc(persona(x))+'</td><td>'+esc(x.responsable||'—')+'</td><td>'+fmt(x.fecha)+'</td></tr>').join(''):'<tr><td colspan="5" style="padding:20px;text-align:center">Sin entregas a '+(filterEntregas==='OPERADOR'?'operadores':'beneficiarios')+'.</td></tr>';
  }

  function renderFolios(){
    const body=document.getElementById('hsFoliosBody');if(!body)return;
    let rows=(D.ultimosFolios||[]).filter(x=>{const t=tipo(x);if(x.estatus==='NUEVO'||x.estatus==='PENDIENTE_ACEPTACION'||x.estatus==='EN_CUSTODIA')return true;return t===filterFolios});
    const th=body.closest('table')?.querySelector('thead tr');if(th)th.innerHTML='<th>FOLIO</th><th>ESTATUS</th><th>RESPONSABLE</th><th>'+(filterFolios==='OPERADOR'?'OPERADOR':'BENEFICIARIO')+'</th>';
    body.innerHTML=rows.length?rows.map(x=>'<tr><td><strong>'+esc(x.folio)+'</strong></td><td>'+esc(x.estatus||'—')+'</td><td>'+esc(x.responsable_nombre||'—')+'</td><td>'+esc(filterFolios==='BENEFICIARIO'?(x.beneficiario_nombre||'—'):(x.operador_nombre||'—'))+'</td></tr>').join(''):'<tr><td colspan="4" style="padding:20px;text-align:center">Sin folios.</td></tr>';
  }

  function pendingPeople(t){
    const rows=(D.foliosAsignadosOperador||[]).filter(x=>tipo(x)===t),map=new Map();
    rows.forEach(x=>{const id=t==='BENEFICIARIO'?x.beneficiarioId:x.operadorId,name=persona(x);if(id&&!map.has(id))map.set(id,{id,name,count:0});if(id)map.get(id).count++});
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'es'));
  }
  function labelPerson(p){return p.name+' · '+p.count+' hoja'+(p.count===1?'':'s')+' pendiente'+(p.count===1?'':'s')}

  async function openManual(preselectedFolio){
    await load();
    const initial=(D.foliosAsignadosOperador||[]).find(x=>x.id===preselectedFolio);let t=initial?tipo(initial):filterComp;
    const o=modal('hsManualV102','Comprobación manual de Hoja de Servicio','<form data-form><div class="cc-grid"><div class="cc-field"><label>Tipo de persona *</label><select name="tipoPersona"><option value="OPERADOR">Operador</option><option value="BENEFICIARIO">Beneficiario</option></select></div><div class="cc-field"><label data-person-label>Seleccionar operador con hojas pendientes *</label><input name="personaSearch" list="hsV102Personas" autocomplete="off" placeholder="Escribe nombre o número..." required><datalist id="hsV102Personas"></datalist><input type="hidden" name="personaId"></div><div class="cc-field"><label>Hoja pendiente *</label><select name="folioId" required><option value="">Primero selecciona la persona…</option></select></div><div class="cc-field"><label>Fecha de comprobación</label><input value="'+esc(new Date().toLocaleString('es-MX'))+'" readonly></div><div class="cc-field"><label>Fecha de uso de hoja *</label><input name="fechaUso" type="date" value="'+today()+'" required></div><div class="cc-field"><label>Cliente *</label><select name="clienteId" required>'+options(D.clientes||[],x=>x.nombre)+'</select></div><div class="cc-field"><label>Tipo de servicio *</label><input name="tipoViaje" required placeholder="Ej. Exportación, Importación, Cruce, Foráneo"></div><div class="cc-field"><label>Clasificación *</label><input name="clasificacion" required placeholder="Ej. Cargado, Vacío, Movimiento"></div></div><div class="cc-field"><label>Observaciones</label><textarea name="observaciones"></textarea></div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Aceptar comprobación</button></div></form>');
    const f=o.querySelector('[data-form]'),search=f.personaSearch,hidden=f.personaId,list=f.querySelector('#hsV102Personas'),folio=f.folioId,label=f.querySelector('[data-person-label]');o.querySelector('[data-cancel]').onclick=()=>o.remove();f.tipoPersona.value=t;
    function people(){return pendingPeople(f.tipoPersona.value)}
    function refill(){const ps=people();label.textContent='Seleccionar '+(f.tipoPersona.value==='OPERADOR'?'operador':'beneficiario')+' con hojas pendientes *';search.placeholder='Escribe nombre o número...';list.innerHTML=ps.map(p=>'<option value="'+esc(labelPerson(p))+'"></option>').join('');hidden.value='';search.value='';folio.innerHTML='<option value="">Primero selecciona la persona…</option>'}
    function resolve(){const q=norm(search.value),ps=people();const p=ps.find(x=>norm(labelPerson(x))===q||norm(x.name)===q);hidden.value=p?.id||'';if(!p){folio.innerHTML='<option value="">Selecciona una coincidencia válida…</option>';return false}const rows=(D.foliosAsignadosOperador||[]).filter(x=>tipo(x)===f.tipoPersona.value&&((f.tipoPersona.value==='BENEFICIARIO'?x.beneficiarioId:x.operadorId)===p.id));folio.innerHTML=options(rows,x=>x.folio,initial?.id);return true}
    f.tipoPersona.onchange=()=>{t=f.tipoPersona.value;refill()};search.oninput=resolve;search.onchange=resolve;refill();
    if(initial){const pid=t==='BENEFICIARIO'?initial.beneficiarioId:initial.operadorId,p=people().find(x=>x.id===pid);if(p){search.value=labelPerson(p);resolve();folio.value=initial.id}}
    f.onsubmit=async e=>{e.preventDefault();if(!resolve()||!hidden.value)return alert('Selecciona una persona válida del autocompletado.');const fd=new FormData(f),x=(D.foliosAsignadosOperador||[]).find(z=>z.id===fd.get('folioId'));if(!x)return alert('Selecciona una hoja pendiente válida.');const expected=f.tipoPersona.value==='BENEFICIARIO'?x.beneficiarioId:x.operadorId;if(expected!==hidden.value)return alert('La hoja seleccionada no corresponde a la persona elegida.');const btn=f.querySelector('[type=submit]');btn.disabled=true;try{await rpc('hs_mark_used',{p_item:{folioId:x.id,fechaUso:fd.get('fechaUso'),clienteId:fd.get('clienteId'),tipoViaje:fd.get('tipoViaje'),clasificacion:fd.get('clasificacion'),servicio:fd.get('tipoViaje'),observaciones:fd.get('observaciones')}});o.remove();await load()}catch(err){alert(err.message||err);btn.disabled=false}}
  }

  function renderAll(){ensureFilters();renderComprobacion();renderEntregas();renderFolios()}
  function install(){
    let n=0;const t=setInterval(()=>{n++;ensureFilters();if(document.getElementById('ccPanelHojasServicio')){load().catch(()=>{});if(n>8)clearInterval(t)}else if(n>40)clearInterval(t)},300);
    document.addEventListener('click',e=>{if(e.target.closest?.('#ccTabHojasServicio,#ccPanelHojasServicio [data-hsv]'))setTimeout(()=>load().catch(()=>{}),300)},true);
    document.addEventListener('hs:comprobacion-actualizada',()=>load().catch(()=>{}));
    setInterval(()=>{const p=document.getElementById('ccPanelHojasServicio');if(p&&getComputedStyle(p).display!=='none')load().catch(()=>{})},10000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
