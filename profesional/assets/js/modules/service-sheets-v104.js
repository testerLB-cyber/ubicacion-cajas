/* Tráfico App Profesional · Control de Hojas de Servicio · v104 ÚNICA */
(function(){
  'use strict';
  if(window.__HS_V104__) return;
  window.__HS_V104__='104';

  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const six=v=>String(Math.max(0,Number(v)||0)).padStart(6,'0');
  const fmt=v=>v?new Date(v).toLocaleString('es-MX'):'—';
  const today=()=>new Date().toISOString().slice(0,10);
  const norm=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
  const active=xs=>(xs||[]).filter(x=>String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
  const perm=p=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('hojas_servicio.'+p));
  const options=(xs,label,selected='')=>'<option value="">Seleccionar…</option>'+xs.map(x=>'<option value="'+esc(x.id)+'" '+(String(x.id)===String(selected)?'selected':'')+'>'+esc(label(x))+'</option>').join('');

  let D={series:[],anios:[],responsables:[],operadores:[],beneficiarios:[],clientes:[],resumen:{},asignacionesResponsable:[],foliosAsignadosOperador:[],asignacionesOperador:[],comprobaciones:[],ultimosFolios:[]};
  let currentView='Control';
  let loadSeq=0;

  async function rpc(name,args={}){
    if(!sb()) throw new Error('Supabase no está disponible.');
    const r=await sb().rpc(name,args);
    if(r.error) throw r.error;
    if(r.data?.ok===false) throw new Error(r.data.error||'Operación no disponible.');
    return r.data;
  }
  async function load(){
    const seq=++loadSeq;
    const refreshBtn=document.getElementById('hs104Refresh');
    if(refreshBtn){refreshBtn.disabled=true;refreshBtn.innerHTML='<i class="fa-solid fa-rotate fa-spin"></i> Actualizando…';}
    try{
      const next=await rpc('hs_list');
      const extras=await Promise.allSettled([
        rpc('cc_hojas_beneficiarios_web'),
        rpc('hs_assignment_selected_folios')
      ]);
      if(seq!==loadSeq)return D;
      D=next||{};
      const ben=extras[0];
      D.beneficiarios=ben.status==='fulfilled'&&Array.isArray(ben.value)?ben.value:[];
      if(ben.status==='rejected')console.warn('Beneficiarios Web',ben.reason);
      const sel=extras[1];
      D.assignmentSelections=sel.status==='fulfilled'?(sel.value||{}):{};
      if(sel.status==='rejected')console.warn('Detalle asignaciones',sel.reason);
      renderAll();
      try{document.dispatchEvent(new CustomEvent('hs104:data-refreshed',{detail:{view:currentView}}));}catch(_){}
      return D;
    }finally{
      if(seq===loadSeq&&refreshBtn){
        refreshBtn.disabled=false;
        refreshBtn.innerHTML='<i class="fa-solid fa-rotate"></i> Actualizar';
      }
    }
  }

  function modal(title,body,{width='820px',saveLabel='',onSave=null}={}){
    const ov=document.createElement('div');
    ov.className='hs104-modal';
    ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100500;display:flex;align-items:center;justify-content:center;padding:14px';
    ov.innerHTML='<div style="width:min('+width+',97vw);max-height:94vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 24px 70px #0f172a55">'+
      '<div style="background:#0f172a;color:white;padding:14px 16px;display:flex;justify-content:space-between;gap:10px;align-items:center"><strong>'+esc(title)+'</strong><button type="button" data-x style="border:0;background:none;color:white;font-size:23px;cursor:pointer">×</button></div>'+
      '<div data-body style="padding:16px">'+body+'</div></div>';
    document.body.appendChild(ov);
    const close=()=>ov.remove();
    ov.querySelector('[data-x]').onclick=close;
    ov.addEventListener('click',e=>{if(e.target===ov)close()});
    if(onSave){
      const form=ov.querySelector('form');
      form.onsubmit=async e=>{e.preventDefault();const btn=form.querySelector('[type=submit]');if(btn)btn.disabled=true;try{await onSave(new FormData(form),form);close();await load()}catch(err){alert(err?.message||err);if(btn)btn.disabled=false}};
      const b=form.querySelector('[type=submit]');if(b&&saveLabel)b.textContent=saveLabel;
    }
    ov.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=close);
    return ov;
  }

  function acceptanceUrl(token){const u=new URL('hojas-servicio-aceptar.html',location.href);u.search='?t='+encodeURIComponent(token);return u.toString()}
  async function copy(text){try{await navigator.clipboard.writeText(text);return true}catch(_){return false}}
  async function sendAssignmentEmail(assignmentId,token){
    const url=acceptanceUrl(token);
    let emailed=false, msg='';
    try{
      const r=await sb().functions.invoke('cc-send-service-sheet-email',{body:{assignmentId,acceptanceUrl:url}});
      if(r.error) throw r.error;
      if(r.data?.ok){emailed=true;msg='Correo enviado a '+(r.data.to||'responsable')+'.'}
      else throw new Error(r.data?.message||r.data?.error||'No se pudo enviar correo.');
    }catch(e){ msg=e?.message||String(e); }
    await copy(url);
    alert(emailed?msg+'\n\nEl enlace también quedó copiado.':'Asignación creada. No se envió correo automáticamente: '+msg+'\n\nEl enlace quedó copiado para compartirlo manualmente.');
    if(!emailed) prompt('Enlace de aceptación:',url);
  }

  function installStyles(){
    if(document.getElementById('hs104-style'))return;
    const st=document.createElement('style');st.id='hs104-style';st.textContent=`
      #ccPanelHojasServicio .hs104-nav{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}
      #ccPanelHojasServicio .hs104-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:13px;box-shadow:0 7px 18px #0f172a0a}
      #ccPanelHojasServicio .hs104-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px}
      #ccPanelHojasServicio .hs-manual-photo-box{margin:0 0 12px;padding:10px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc}
      #ccPanelHojasServicio .hs-manual-photo-box label{display:block;font-weight:800;color:#334155;margin-bottom:7px}
      #ccPanelHojasServicio .hs-photo-methods{display:flex;align-items:center;gap:8px;flex-wrap:wrap;width:auto}
      #ccPanelHojasServicio .hs-photo-methods .cc-btn{width:auto;min-width:0;min-height:36px;white-space:nowrap;font-size:12px;padding:8px 11px}
      #ccPanelHojasServicio .hs-photo-methods [data-file]{display:none}
      #ccPanelHojasServicio .hs-manual-photo-status{margin-top:7px;color:#64748b}
      #ccPanelHojasServicio .hs104-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
      #ccPanelHojasServicio .hs104-note{font-size:10px;color:#64748b;margin-top:3px}
      #ccPanelHojasServicio .hs104-pill{display:inline-block;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:900;background:#f1f5f9;color:#334155}
      #ccPanelHojasServicio .hs104-danger{background:#fff7ed;color:#9a3412}
      #ccPanelHojasServicio .hs104-ok{background:#dcfce7;color:#166534}
      #ccPanelHojasServicio .hs104-row{display:grid;gap:10px;margin-bottom:10px}
      #hs104CompList .hs-list-row{padding:11px 13px;margin-bottom:7px;box-shadow:none;border-radius:10px}
      #hs104CompList .hs-list-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
      #hs104CompList .hs-list-info{min-width:0}
      #hs104CompList .hs-list-info strong{font-size:13px;color:#0f172a}
      #hs104CompList .hs-list-info .hs104-note{font-size:11px;line-height:1.5}
      #hs104CompList .hs-list-head-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
      #hs104CompList .hs-list-edit-area{display:none;position:fixed;inset:0;z-index:100700;padding:14px;background:rgba(15,23,42,.78);align-items:center;justify-content:center}
      #hs104CompList .hs-list-modal-open .hs-list-edit-area{display:flex}
      #hs104CompList .hs-list-dialog{width:min(1080px,100%);max-height:94vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 24px 70px #0005}
      #hs104CompList .hs-list-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 16px;background:#0f172a;color:#fff}
      #hs104CompList .hs-list-dialog-body{padding:18px 20px}
      #hs104CompList .hs-list-dialog-close{border:0;background:transparent;color:#fff;font-size:25px;cursor:pointer}
      #hs104CompList .hs-list-modal-open{position:static}
      #hs104CompList .hs-list-dialog-body>.cc-field{margin:10px 0}
      #hs104CompList .hs-list-dialog-body>.hs104-actions{margin-top:12px}
      @media(max-width:700px){#ccPanelHojasServicio .cc-toolbar{align-items:flex-start;gap:8px}#ccPanelHojasServicio .hs104-actions{justify-content:flex-start}}
      @media(max-width:460px){#hs104CompList .hs-list-head{align-items:flex-start}#hs104CompList .hs-list-head-actions{flex-direction:column;align-items:flex-end}#hs104CompList .hs-list-edit-area{padding:6px}#hs104CompList .hs-list-dialog{max-height:98vh}#ccPanelHojasServicio .hs-photo-methods .cc-btn{font-size:11px;padding:7px 8px}}
    `;document.head.appendChild(st);
  }

  function install(){
    installStyles();
    const root=document.getElementById('controlCajasSection'), tabs=root?.querySelector('.cc-tabs');
    if(!root||!tabs)return false;
    document.querySelectorAll('#ccTabHojasServicio,#ccPanelHojasServicio').forEach(x=>x.remove());
    const btn=document.createElement('button');btn.id='ccTabHojasServicio';btn.className='cc-tab';btn.innerHTML='<i class="fa-solid fa-file-lines mr-1"></i>Control de Hojas de Servicio';
    const ant=[...tabs.querySelectorAll('.cc-tab')].find(x=>(x.textContent||'').includes('Control de Anticipos'));ant?ant.after(btn):tabs.appendChild(btn);
    const p=document.createElement('div');p.id='ccPanelHojasServicio';p.className='cc-panel';
    p.innerHTML='<div class="cc-toolbar"><div><strong>Control de Hojas de Servicio</strong><div class="cc-note">Versión única v104 · folios, custodia, entrega y comprobación.</div></div><button class="cc-btn cc-btn-light" id="hs104Refresh"><i class="fa-solid fa-rotate"></i> Actualizar</button></div><div id="hs104Kpis" class="cc-ant-kpis"></div><div class="hs104-nav" id="hs104Nav"></div><div id="hs104View"></div>';
    root.appendChild(p);
    btn.style.display=perm('ver')?'':'none';
    btn.onclick=()=>{if(!perm('ver'))return alert('Sin permiso para Hojas de Servicio.');root.querySelectorAll('.cc-tab').forEach(x=>x.classList.remove('active'));root.querySelectorAll('.cc-panel').forEach(x=>x.classList.remove('active'));btn.classList.add('active');p.classList.add('active');load().catch(e=>alert(e.message||e));};
    p.querySelector('#hs104Refresh').onclick=()=>load().catch(e=>alert(e.message||e));
    window.ccHsOpen=()=>btn.click();
    return true;
  }

  const navItems=[['Control','fa-location-crosshairs'],['Folios','fa-file-lines'],['Responsables','fa-user-shield'],['Operadores','fa-users'],['Comprobacion','fa-clipboard-check'],['Proforma','fa-file-invoice-dollar'],['Catalogos','fa-list']];
  async function openProformaView(){
    currentView='Proforma';renderNav();
    if(typeof window.hsOpenProformas==='function')return window.hsOpenProformas();
    const h=view();if(h)h.innerHTML='<div class="hs104-card" style="padding:22px;text-align:center"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Cargando Proforma…</div>';
    try{
      let s=document.querySelector('script[data-hs-proforma-loader]');
      if(!s){
        s=document.createElement('script');
        s.src='assets/js/modules/service-sheets-proformas-v1.js?v=20261002-no-facturable2';
        s.dataset.hsProformaLoader='1';
        document.body.appendChild(s);
      }
      await new Promise((resolve,reject)=>{
        if(typeof window.hsOpenProformas==='function')return resolve();
        const started=Date.now(),check=()=>{if(typeof window.hsOpenProformas==='function')return resolve();if(Date.now()-started>8000)return reject(new Error('No se pudo cargar el módulo de Proformas.'));setTimeout(check,80)};check();
      });
      return window.hsOpenProformas();
    }catch(e){
      if(h)h.innerHTML='<div class="hs104-card" style="padding:22px;color:#b91c1c"><b>No se pudo abrir Proforma.</b><div class="hs104-note" style="margin-top:6px">'+esc(e.message||e)+'</div><button type="button" class="cc-btn cc-btn-light" id="hs104RetryProforma" style="margin-top:10px">Reintentar</button></div>';
      document.getElementById('hs104RetryProforma')?.addEventListener('click',openProformaView);
    }
  }
  function renderNav(){const n=document.getElementById('hs104Nav');if(!n)return;n.innerHTML=navItems.map(([v,i])=>'<button class="cc-btn '+(currentView===v?'cc-btn-primary':'cc-btn-light')+'" data-v="'+v+'"><i class="fa-solid '+i+' mr-1"></i>'+({Comprobacion:'Comprobación'}[v]||v)+'</button>').join('');n.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{if(b.dataset.v==='Proforma')return openProformaView();currentView=b.dataset.v;renderNav();renderView()})}
  function renderKpis(){const r=D.resumen||{},k=document.getElementById('hs104Kpis');if(!k)return;k.innerHTML=[['Total',r.total],['Nuevas',r.nuevos],['Pend. aceptación',r.pendienteAceptacion],['Con responsable',r.enCustodia],['Pend. comprobar',r.asignadosOperador],['Comprobadas',r.utilizados]].map(x=>'<div class="cc-ant-kpi"><small>'+x[0]+'</small><strong>'+Number(x[1]||0).toLocaleString('es-MX')+'</strong></div>').join('')}
  function renderAll(){renderKpis();renderNav();if(currentView==='Proforma')openProformaView();else renderView()}
  function renderView(){if(document.querySelector('#hs104CompList .hs-list-modal-open'))document.body.style.overflow='';({Control:renderControl,Folios:renderFolios,Responsables:renderResponsables,Operadores:renderOperadores,Comprobacion:renderComprobacion,Catalogos:renderCatalogos}[currentView]||renderControl)()}
  const view=()=>document.getElementById('hs104View');

  function renderControl(){
    const v=view();if(!v)return;
    const series=(D.series||[]).slice().sort((a,b)=>String(a.codigo||'').localeCompare(String(b.codigo||''),'es',{numeric:true,sensitivity:'base'}));
    v.innerHTML='<div class="hs104-card"><div class="cc-toolbar" style="align-items:flex-start"><div><strong>Rastreo general</strong><div class="hs104-note">Filtra todo el historial por estado, serie, rango de folios, fecha de registro o búsqueda general.</div></div><div class="hs104-actions"><button type="button" class="cc-btn cc-btn-primary" id="hs104CtlExcel"><i class="fa-solid fa-file-excel"></i> Exportar a Excel</button></div></div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:9px;margin:10px 0 12px">'+
        '<div class="cc-field"><label>Estado</label><select id="hs104CtlStatus" class="cc-input"><option value="">Todos los estados</option><option value="NUEVO">Nuevas</option><option value="PENDIENTE_ACEPTACION">Pend. aceptación</option><option value="EN_CUSTODIA">Con responsable</option><option value="ASIGNADO_OPERADOR">Pend. comprobar</option><option value="UTILIZADO">Comprobadas</option></select></div>'+
        '<div class="cc-field"><label>Serie</label><select id="hs104CtlSerie" class="cc-input"><option value="">Todas las series</option>'+series.map(x=>'<option value="'+esc(x.codigo)+'">'+esc(x.codigo)+'</option>').join('')+'</select></div>'+
        '<div class="cc-field"><label>Folio desde</label><input id="hs104CtlDesde" class="cc-input" type="number" min="0" step="1" placeholder="Ej. 12000"></div>'+
        '<div class="cc-field"><label>Folio hasta</label><input id="hs104CtlHasta" class="cc-input" type="number" min="0" step="1" placeholder="Ej. 12500"></div>'+
        '<div class="cc-field"><label>Fecha desde</label><input id="hs104CtlFechaDesde" class="cc-input" type="date"></div>'+
        '<div class="cc-field"><label>Fecha hasta</label><input id="hs104CtlFechaHasta" class="cc-input" type="date"></div>'+
        '<div class="cc-field" style="grid-column:span 2"><label>Búsqueda general</label><input id="hs104CtlSearch" class="cc-input" type="search" placeholder="Folio, responsable, operador, cliente o servicio..."></div>'+
        '<div class="cc-field" style="display:flex;align-items:flex-end"><button type="button" class="cc-btn cc-btn-light" id="hs104CtlClear" style="width:100%"><i class="fa-solid fa-filter-circle-xmark"></i> Limpiar filtros</button></div>'+
      '</div>'+
      '<div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>FOLIO</th><th>FECHA</th><th>ESTADO</th><th>RESPONSABLE</th><th>PERSONA</th><th>SERVICIO / CLIENTE</th></tr></thead><tbody id="hs104CtlBody"></tbody></table></div>'+
      '<div class="hs104-actions" style="margin-top:10px;align-items:center"><span id="hs104CtlPageInfo" class="hs104-note"></span><button type="button" class="cc-btn cc-btn-light" id="hs104CtlPrev">Anterior</button><button type="button" class="cc-btn cc-btn-light" id="hs104CtlNext">Siguiente</button></div></div>';
    const body=v.querySelector('#hs104CtlBody'),search=v.querySelector('#hs104CtlSearch'),status=v.querySelector('#hs104CtlStatus'),serie=v.querySelector('#hs104CtlSerie'),desde=v.querySelector('#hs104CtlDesde'),hasta=v.querySelector('#hs104CtlHasta'),fechaDesde=v.querySelector('#hs104CtlFechaDesde'),fechaHasta=v.querySelector('#hs104CtlFechaHasta'),clear=v.querySelector('#hs104CtlClear'),excel=v.querySelector('#hs104CtlExcel'),info=v.querySelector('#hs104CtlPageInfo'),prev=v.querySelector('#hs104CtlPrev'),next=v.querySelector('#hs104CtlNext');
    let page=1,pages=1,timer=null,req=0;
    const paint=rows=>{body.innerHTML=rows.length?rows.map(x=>{const fd=x.fecha_control||x.created_at,lab=x.tipo_fecha_control==='ASIGNACION_RESPONSABLE'?'Asignación responsable':'Creación';return '<tr><td><strong>'+esc(x.folio)+'</strong></td><td>'+esc(fd?new Date(fd).toLocaleDateString('es-MX'):'—')+'<div class="hs104-note">'+lab+'</div></td><td><span class="hs104-pill">'+esc(x.estatus)+'</span></td><td>'+esc(x.responsable_nombre||'—')+'</td><td>'+esc(x.beneficiario_nombre||x.operador_nombre||'—')+'</td><td>'+esc(x.servicio||'—')+'<div class="hs104-note">'+esc(x.cliente_nombre||'')+'</div></td></tr>'}).join(''):'<tr><td colspan="6" style="text-align:center;padding:22px">Sin resultados con los filtros seleccionados.</td></tr>'};
    const n=v=>{const x=Number(v);return Number.isFinite(x)&&v!==''?Math.trunc(x):null};
    const loadPage=async()=>{
      const my=++req;body.innerHTML='<tr><td colspan="6" style="text-align:center;padding:22px">Buscando…</td></tr>';
      try{
        const r=await rpc('hs_control_page_v2',{
          p_page:page,p_page_size:100,p_search:search.value.trim()||null,p_status:status.value||null,
          p_serie:serie.value||null,p_folio_desde:n(desde.value),p_folio_hasta:n(hasta.value),
          p_fecha_desde:fechaDesde.value||null,p_fecha_hasta:fechaHasta.value||null
        });
        if(my!==req)return;
        pages=Number(r.pages||1);if(page>pages){page=pages;return loadPage()}
        paint(Array.isArray(r.rows)?r.rows:[]);
        info.textContent='Página '+page+' de '+pages+' · '+Number(r.total||0).toLocaleString('es-MX')+' folio(s)';
        prev.disabled=page<=1;next.disabled=page>=pages;
      }catch(e){body.innerHTML='<tr><td colspan="6" style="text-align:center;padding:22px;color:#b91c1c">'+esc(e.message||e)+'</td></tr>';}
    };
    const getFilters=()=>({
      p_search:search.value.trim()||null,p_status:status.value||null,p_serie:serie.value||null,
      p_folio_desde:n(desde.value),p_folio_hasta:n(hasta.value),
      p_fecha_desde:fechaDesde.value||null,p_fecha_hasta:fechaHasta.value||null
    });
    const exportExcel=async()=>{
      if(!window.XLSX)return alert('No está disponible el componente para exportar Excel.');
      const old=excel.innerHTML;excel.disabled=true;excel.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Generando...';
      try{
        const filters=getFilters(),all=[];
        let p=1,totalPages=1;
        do{
          const r=await rpc('hs_control_page_v2',{p_page:p,p_page_size:200,...filters});
          if(Array.isArray(r.rows))all.push(...r.rows);
          totalPages=Math.max(1,Number(r.pages||1));p++;
        }while(p<=totalPages);
        if(!all.length)return alert('No hay resultados para exportar con los filtros actuales.');
        const data=all.map(x=>({
          'Folio':x.folio||'',
          'Serie':x.serie||'',
          'Año':x.anio||'',
          'Fecha':x.fecha_control?new Date(x.fecha_control).toLocaleDateString('es-MX'):(x.created_at?new Date(x.created_at).toLocaleDateString('es-MX'):''),
          'Tipo de fecha':x.tipo_fecha_control==='ASIGNACION_RESPONSABLE'?'Asignación responsable':'Creación',
          'Estado':x.estatus||'',
          'Responsable':x.responsable_nombre||'',
          'Persona':x.beneficiario_nombre||x.operador_nombre||'',
          'Servicio':x.servicio||'',
          'Cliente':x.cliente_nombre||''
        }));
        const ws=XLSX.utils.json_to_sheet(data);
        ws['!cols']=[{wch:20},{wch:12},{wch:8},{wch:14},{wch:24},{wch:22},{wch:28},{wch:28},{wch:28},{wch:32}];
        const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Control de Hojas');
        const stamp=new Date().toISOString().slice(0,10);
        XLSX.writeFile(wb,'Control_Hojas_'+stamp+'.xlsx');
      }catch(e){alert('No se pudo exportar a Excel: '+(e.message||e))}
      finally{excel.disabled=false;excel.innerHTML=old}
    };
    const refresh=()=>{page=1;loadPage()};
    search.oninput=()=>{clearTimeout(timer);timer=setTimeout(refresh,250)};
    [status,serie,fechaDesde,fechaHasta].forEach(x=>x.onchange=refresh);
    [desde,hasta].forEach(x=>x.oninput=()=>{clearTimeout(timer);timer=setTimeout(refresh,250)});
    clear.onclick=()=>{status.value='';serie.value='';desde.value='';hasta.value='';fechaDesde.value='';fechaHasta.value='';search.value='';refresh()};
    excel.onclick=exportExcel;
    prev.onclick=()=>{if(page>1){page--;loadPage()}};
    next.onclick=()=>{if(page<pages){page++;loadPage()}};
    loadPage();
  }

  function renderFolios(){
    const v=view();if(!v)return;
    const rows=D.ultimosFolios||[];
    v.innerHTML='<div class="hs104-card"><div class="cc-toolbar"><div><strong>Folios</strong><div class="hs104-note">Puedes corregir o eliminar folios mientras no hayan sido utilizados.</div></div><div class="hs104-actions"><input id="hs104FolioSearch" class="cc-input" type="search" placeholder="Buscar folio, responsable o persona..."><button class="cc-btn cc-btn-primary" id="hs104Generate">Generar folios</button></div></div><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>FOLIO</th><th>ESTATUS</th><th>RESPONSABLE</th><th>PERSONA</th><th>CREADO</th><th>ACCIONES</th></tr></thead><tbody id="hs104FoliosBody"></tbody></table></div></div>';
    const draw=()=>{
      const q=norm(v.querySelector('#hs104FolioSearch').value);
      const filtered=rows.filter(x=>!q||norm([x.folio,x.estatus,x.responsable_nombre,x.beneficiario_nombre,x.operador_nombre].join(' ')).includes(q));
      v.querySelector('#hs104FoliosBody').innerHTML=filtered.length?filtered.map(x=>{
        const used=String(x.estatus||'').toUpperCase()==='UTILIZADO';
        const actions=used
          ? '<span class="hs104-pill hs104-ok">Utilizado · protegido</span>'
          : '<button type="button" class="cc-btn cc-btn-light" data-edit-folio="'+esc(x.id)+'"><i class="fa-solid fa-pen"></i> Editar</button><button type="button" class="cc-btn cc-btn-light" data-delete-folio="'+esc(x.id)+'" style="color:#b91c1c"><i class="fa-solid fa-trash"></i> Eliminar</button>';
        return '<tr><td><strong>'+esc(x.folio)+'</strong></td><td>'+esc(x.estatus)+'</td><td>'+esc(x.responsable_nombre||'—')+'</td><td>'+esc(x.beneficiario_nombre||x.operador_nombre||'—')+'</td><td>'+fmt(x.created_at)+'</td><td><div class="hs104-actions">'+actions+'</div></td></tr>';
      }).join(''):'<tr><td colspan="6" style="text-align:center;padding:20px">Sin resultados.</td></tr>';
      v.querySelectorAll('[data-edit-folio]').forEach(b=>b.onclick=()=>editFolioFromList(rows.find(x=>String(x.id)===String(b.dataset.editFolio))));
      v.querySelectorAll('[data-delete-folio]').forEach(b=>b.onclick=()=>deleteUnusedFolio(rows.find(x=>String(x.id)===String(b.dataset.deleteFolio))));
    };
    v.querySelector('#hs104FolioSearch').oninput=draw;
    v.querySelector('#hs104Generate').onclick=openGenerate;
    draw();
  }
  function editFolioFromList(x){
    if(!x)return;
    const st=String(x.estatus||'').toUpperCase();
    if(st==='NUEVO')return openEditFolioIdentity(x);
    if(st==='PENDIENTE_ACEPTACION'||st==='EN_CUSTODIA'){
      const a=(D.asignacionesResponsable||[]).find(a=>{const fs=D.assignmentSelections?.[a.id]?.folios;return Array.isArray(fs)&&fs.length?fs.some(f=>norm(f)===norm(x.folio)):(String(a.serie)===String(x.serie)&&String(a.anio)===String(x.anio)&&Number(x.consecutivo)>=Number(a.desde)&&Number(x.consecutivo)<=Number(a.hasta));});
      if(a)return openEditResponsible(a);
    }
    if(st==='ASIGNADO_OPERADOR'){
      const a=(D.asignacionesOperador||[]).find(a=>String(a.folioId)===String(x.id)&&['ACTIVA','ACTIVO'].includes(String(a.estatus||'').toUpperCase()));
      if(a)return openEditOperator(a);
    }
    if(st==='CANCELADO')return alert('Esta hoja está cancelada. Sus datos de comprobación se editan desde Historial de comprobaciones; también puedes eliminar el folio aquí porque no fue utilizado.');
    alert('Este folio no tiene una asignación editable desde este estado.');
  }
  function openEditFolioIdentity(x){
    if(!perm('generar'))return alert('Sin permiso para editar folios.');
    const s=(D.series||[]).find(z=>String(z.codigo)===String(x.serie));
    const y=(D.anios||[]).find(z=>String(z.anio)===String(x.anio));
    modal('Editar folio · '+x.folio,'<form><div class="hs104-grid"><div class="cc-field"><label>Serie *</label><select name="serieId" required>'+options(active(D.series),z=>z.codigo,s?.id||'')+'</select></div><div class="cc-field"><label>Año *</label><select name="anioId" required>'+options(active(D.anios),z=>z.anio,y?.id||'')+'</select></div><div class="cc-field"><label>Consecutivo *</label><input name="consecutivo" type="number" min="0" max="999999" required value="'+esc(x.consecutivo)+'"></div></div><div class="hs104-note" style="margin-top:10px">La identidad del folio solo se puede cambiar directamente cuando todavía está NUEVO. Si ya fue asignado, usa Editar para corregir responsable u operador.</div><div class="hs104-actions" style="margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar cambios</button></div></form>',{onSave:async fd=>{await rpc('hs_edit_folio_identity',{p_item:{folioId:x.id,serieId:fd.get('serieId'),anioId:fd.get('anioId'),consecutivo:Number(fd.get('consecutivo'))}})}});
  }
  async function deleteUnusedFolio(x){
    if(!x)return;
    if(!perm('generar'))return alert('Sin permiso para eliminar folios.');
    if(!confirm('¿Eliminar el folio '+x.folio+'?\n\nSolo se permitirá si NO ha sido utilizado. Esta acción quitará también sus asignaciones o registros previos no utilizados.'))return;
    try{await rpc('hs_delete_unused_folio',{p_folio_id:x.id});await load();alert('Folio '+x.folio+' eliminado.')}catch(e){alert(e.message||e)}
  }
  function openGenerate(){
    if(!perm('generar'))return alert('Sin permiso para generar folios.');
    const ss=active(D.series),ys=active(D.anios);
    if(!ss.length||!ys.length)return alert('Primero agrega Serie y Año en Catálogos.');

    const body='<form><div class="hs104-grid">'+
      '<div class="cc-field"><label>Serie *</label><select name="serieId" required>'+options(ss,x=>x.codigo)+'</select></div>'+
      '<div class="cc-field"><label>Año *</label><select name="anioId" required>'+options(ys,x=>x.anio)+'</select></div>'+
      '<div class="cc-field"><label>Forma de generación *</label><select name="modo"><option value="RANGO">Por rango</option><option value="INDIVIDUAL">Folio individual</option><option value="VARIOS">Varios folios</option></select></div>'+
      '</div>'+
      '<div data-mode="RANGO" style="margin-top:10px"><div class="hs104-grid"><div class="cc-field"><label>Desde *</label><input name="desde" inputmode="numeric" maxlength="6" placeholder="Ej. 12202 ó 012202"></div><div class="cc-field"><label>Hasta *</label><input name="hasta" inputmode="numeric" maxlength="6" placeholder="Ej. 12251 ó 012251"></div></div><div data-range-status class="hs104-note" style="margin-top:8px;padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc">Acepta 5 dígitos o 6 posiciones cuando incluye el cero inicial.</div></div>'+
      '<div data-mode="INDIVIDUAL" style="display:none;margin-top:10px"><div class="cc-field"><label>Folio *</label><input name="individual" inputmode="numeric" maxlength="5" placeholder="5 dígitos, ej. 12313"><div class="hs104-note" data-individual-status>Captura exactamente 5 dígitos.</div></div></div>'+
      '<div data-mode="VARIOS" style="display:none;margin-top:10px"><div class="cc-field"><label>Varios folios *</label><input name="varios" inputmode="numeric" placeholder="Escribe 5 dígitos y presiona coma o Enter"><div class="hs104-note">Cada folio se valida al completar 5 dígitos. Puedes separarlos con coma o Enter.</div></div><div data-chips style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"></div><div class="hs104-note" data-multi-status></div></div>'+
      '<div data-error style="display:none;margin-top:10px;padding:10px;border-radius:10px;background:#fef2f2;color:#b91c1c;font-weight:700"></div>'+
      '<div class="hs104-actions" style="margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Generar folios</button></div></form>';

    const o=modal('Generar folios',body,{onSave:async(fd,form)=>{
      const modo=String(fd.get('modo')||'RANGO');
      const serieId=String(fd.get('serieId')||''),anioId=String(fd.get('anioId')||'');
      const err=form.querySelector('[data-error]');
      err.style.display='none';err.textContent='';
      if(modo==='RANGO'){
        const normalizeRangeFolio=value=>{
          let n=String(value||'').replace(/\D/g,'');
          if(n.length===6&&n.startsWith('0'))n=n.slice(1);
          return n;
        };
        const ds=normalizeRangeFolio(fd.get('desde')),hs=normalizeRangeFolio(fd.get('hasta'));
        if(!/^\d{5}$/.test(ds))throw new Error('Desde debe tener 5 dígitos; también se acepta con cero inicial, por ejemplo 012202.');
        if(!/^\d{5}$/.test(hs))throw new Error('Hasta debe tener 5 dígitos; también se acepta con cero inicial, por ejemplo 012251.');
        const d=Number(ds),h=Number(hs);
        if(h<d)throw new Error('El folio Hasta no puede ser menor que Desde.');
        const pre=await rpc('hs_preview_folio_range',{p_item:{serieId,anioId,desde:d,hasta:h}});
        if(pre.posible===false){
          if(pre.error==='RANGO_MAXIMO_200000')throw new Error('El rango solicita '+Number(pre.solicitados||0).toLocaleString('es-MX')+' hojas y el máximo permitido es '+Number(pre.maximo||200000).toLocaleString('es-MX')+'.');
          throw new Error(Number(pre.generables||0)===0?'No se puede generar: todas las hojas de ese rango ya existen.':'El rango no es válido.');
        }
        const solicitadas=Number(pre.solicitados||0),existentes=Number(pre.existentes||0),generables=Number(pre.generables||0);
        const detalle='Rango '+pre.folioDesde+' → '+pre.folioHasta+'\n\nSolicitadas: '+solicitadas.toLocaleString('es-MX')+'\nYa existentes: '+existentes.toLocaleString('es-MX')+'\nSe van a generar: '+generables.toLocaleString('es-MX');
        if(!confirm(detalle+'\n\n¿Generar ahora?'))return;
        const r=await rpc('hs_generate_folios',{p_item:{serieId,anioId,desde:d,hasta:h}});
        const gen=Number(r.generados||0),ex=Number(r.existentes||0);
        if(gen!==generables)throw new Error('Verificación: se esperaban '+generables+' folios nuevos pero se generaron '+gen+'. Actualiza y revisa antes de continuar.');
        if(gen===0&&ex>0)throw new Error('No se generó ningún folio: todo el rango ya existe.');
        alert('Generación verificada.\nFolios generados: '+gen.toLocaleString('es-MX')+(ex?'\nYa existentes: '+ex.toLocaleString('es-MX'):''));
        return;
      }
      if(modo==='INDIVIDUAL'){
        const raw=String(fd.get('individual')||'').trim();
        if(!/^\\d{5}$/.test(raw))throw new Error('El folio individual debe tener exactamente 5 dígitos.');
        const check=await rpc('hs_check_folio_number',{p_serie_id:serieId,p_anio_id:anioId,p_consecutivo:Number(raw)});
        if(check.exists)throw new Error('El folio '+check.folio+' ya existe. Estatus: '+(check.estatus||'sin estatus')+(check.responsable?' · Responsable: '+check.responsable:''));
        const r=await rpc('hs_generate_folio_list',{p_item:{serieId,anioId,folios:[Number(raw)]}});
        alert('Folio generado: '+(r.foliosGenerados?.[0]||raw));
        return;
      }
      if(modo==='VARIOS'){
        const nums=[...form.__folioSet||[]].map(x=>Number(x));
        if(!nums.length)throw new Error('Agrega al menos un folio válido.');
        const r=await rpc('hs_generate_folio_list',{p_item:{serieId,anioId,folios:nums}});
        if((r.foliosExistentes||[]).length)throw new Error('No se generaron todos los folios porque ya existen: '+r.foliosExistentes.join(', '));
        alert('Folios generados: '+Number(r.generados||0));
      }
    }});

    const form=o.querySelector('form'),mode=form.modo,serie=form.serieId,anio=form.anioId,individual=form.individual,varios=form.varios,desde=form.desde,hasta=form.hasta,chips=o.querySelector('[data-chips]'),multiStatus=o.querySelector('[data-multi-status]'),individualStatus=o.querySelector('[data-individual-status]'),rangeStatus=o.querySelector('[data-range-status]');
    form.__folioSet=new Set();

    const showMode=()=>{
      o.querySelectorAll('[data-mode]').forEach(x=>x.style.display=x.dataset.mode===mode.value?'':'none');
      form.__folioSet.clear();chips.innerHTML='';varios.value='';individual.value='';multiStatus.textContent='';individualStatus.textContent='Captura exactamente 5 dígitos.';
    };
    let rangeTimer=null,rangeSeq=0;
    const previewRange=async()=>{
      if(!rangeStatus)return;
      const clean=v=>String(v||'').replace(/\D/g,'').slice(0,6);
      const normalize=v=>v.length===6&&v.startsWith('0')?v.slice(1):v;
      const dsRaw=clean(desde?.value),hsRaw=clean(hasta?.value),ds=normalize(dsRaw),hs=normalize(hsRaw);
      if(desde)desde.value=dsRaw;if(hasta)hasta.value=hsRaw;
      if(mode.value!=='RANGO')return;
      if(!serie.value||!anio.value){rangeStatus.textContent='Selecciona Serie y Año para revisar el rango.';rangeStatus.style.color='#64748b';return;}
      if(ds.length!==5||hs.length!==5){rangeStatus.textContent='Captura 5 dígitos, o 6 si incluye el cero inicial del folio mostrado.';rangeStatus.style.color='#64748b';return;}
      const d=Number(ds),h=Number(hs);
      if(h<d){rangeStatus.textContent='✕ Hasta no puede ser menor que Desde.';rangeStatus.style.color='#b91c1c';return;}
      const seq=++rangeSeq;rangeStatus.textContent='Revisando rango…';rangeStatus.style.color='#475569';
      try{
        const r=await rpc('hs_preview_folio_range',{p_item:{serieId:serie.value,anioId:anio.value,desde:d,hasta:h}});
        if(seq!==rangeSeq)return;
        if(r.posible===false){
          if(r.error==='RANGO_MAXIMO_200000')rangeStatus.textContent='✕ '+Number(r.solicitados||0).toLocaleString('es-MX')+' hojas solicitadas. Máximo permitido: '+Number(r.maximo||200000).toLocaleString('es-MX')+'.';
          else rangeStatus.textContent='✕ '+Number(r.solicitados||0).toLocaleString('es-MX')+' hojas en el rango · '+Number(r.existentes||0).toLocaleString('es-MX')+' ya existen · 0 por generar.';
          rangeStatus.style.color='#b91c1c';return;
        }
        rangeStatus.innerHTML='<b>✓ Rango disponible</b> · '+Number(r.solicitados||0).toLocaleString('es-MX')+' solicitadas · '+Number(r.existentes||0).toLocaleString('es-MX')+' ya existen · <b>'+Number(r.generables||0).toLocaleString('es-MX')+' se generarán</b><br>'+esc(r.folioDesde||'')+' → '+esc(r.folioHasta||'');
        rangeStatus.style.color='#15803d';
      }catch(e){if(seq!==rangeSeq)return;rangeStatus.textContent=e.message||e;rangeStatus.style.color='#b91c1c';}
    };
    const scheduleRange=()=>{clearTimeout(rangeTimer);rangeTimer=setTimeout(previewRange,280);};
    [desde,hasta].forEach(x=>x&&x.addEventListener('input',scheduleRange));
    const validateOne=async raw=>{
      const n=String(raw||'').replace(/\\D/g,'');
      if(n.length!==5)throw new Error('El folio '+(raw||'')+' debe tener exactamente 5 dígitos.');
      if(form.__folioSet.has(n))throw new Error('El folio '+n+' ya fue agregado.');
      if(!serie.value||!anio.value)throw new Error('Selecciona primero Serie y Año.');
      const r=await rpc('hs_check_folio_number',{p_serie_id:serie.value,p_anio_id:anio.value,p_consecutivo:Number(n)});
      if(r.exists)throw new Error('El folio '+r.folio+' ya existe. Estatus: '+(r.estatus||'sin estatus')+(r.responsable?' · Responsable: '+r.responsable:'')+(r.operador?' · Persona: '+r.operador:''));
      form.__folioSet.add(n);
      renderChips();
      multiStatus.textContent='✓ '+form.__folioSet.size+' folio(s) listos para generar.';
      multiStatus.style.color='#15803d';
    };
    const renderChips=()=>{
      chips.innerHTML=[...form.__folioSet].map(n=>'<span style="display:inline-flex;align-items:center;gap:7px;background:#e2e8f0;border-radius:999px;padding:6px 10px;font-weight:800">'+esc(String(n).padStart(5,'0'))+'<button type="button" data-chip="'+esc(String(n))+'" style="border:0;background:transparent;cursor:pointer;font-size:16px;line-height:1">×</button></span>').join('');
      chips.querySelectorAll('[data-chip]').forEach(b=>b.onclick=()=>{form.__folioSet.delete(String(b.dataset.chip));renderChips();multiStatus.textContent=form.__folioSet.size?form.__folioSet.size+' folio(s) listos.':'Agrega folios de 5 dígitos.';});
    };
    const processMulti=async()=>{
      const parts=String(varios.value||'').split(/[\\s,]+/).filter(Boolean);
      if(!parts.length)return;
      varios.value='';
      for(const p of parts){
        try{await validateOne(p)}
        catch(e){multiStatus.textContent=e.message||e;multiStatus.style.color='#b91c1c';return;}
      }
    };
    mode.onchange=showMode;
    varios.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===','){e.preventDefault();processMulti();}});
    varios.addEventListener('input',()=>{const clean=varios.value.replace(/[^0-9,\\s]/g,'');if(clean!==varios.value)varios.value=clean;if(/^\\d{5}$/.test(varios.value.trim()))processMulti();});
    individual.addEventListener('input',async()=>{
      individual.value=individual.value.replace(/\\D/g,'').slice(0,5);
      if(individual.value.length<5){individualStatus.textContent='Captura exactamente 5 dígitos.';individualStatus.style.color='#64748b';return;}
      if(!serie.value||!anio.value){individualStatus.textContent='Selecciona primero Serie y Año.';individualStatus.style.color='#b91c1c';return;}
      try{const r=await rpc('hs_check_folio_number',{p_serie_id:serie.value,p_anio_id:anio.value,p_consecutivo:Number(individual.value)});individualStatus.textContent=r.exists?'✕ '+r.folio+' ya existe · '+(r.estatus||''):'✓ '+r.folio+' disponible';individualStatus.style.color=r.exists?'#b91c1c':'#15803d';}catch(e){individualStatus.textContent=e.message||e;individualStatus.style.color='#b91c1c';}
    });
    [serie,anio].forEach(x=>x.onchange=()=>{form.__folioSet.clear();renderChips();multiStatus.textContent='';if(individual.value.length===5)individual.dispatchEvent(new Event('input'));scheduleRange();});
    showMode();
  }

  function renderResponsables(){
    const v=view();if(!v)return;const rows=D.asignacionesResponsable||[];
    v.innerHTML='<div class="hs104-card"><div class="cc-toolbar"><div><strong>Custodia por responsable</strong><div class="hs104-note">Asigna una hoja, un rango continuo o varias hojas específicas. Todas se validan antes de confirmar.</div></div><div class="hs104-actions"><input id="hs104RespSearch" class="cc-input" type="search" placeholder="Buscar responsable, rango o estatus..."><button class="cc-btn cc-btn-primary" id="hs104AssignResp">Asignar hojas</button></div></div><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>RANGO</th><th>RESPONSABLE</th><th>ESTATUS</th><th>ACEPTADO</th><th>ACCIONES</th></tr></thead><tbody id="hs104RespBody"></tbody></table></div></div>';
    const draw=()=>{
      const q=norm(v.querySelector('#hs104RespSearch').value);
      const filtered=rows.filter(x=>!q||norm([x.serie,x.anio,x.desde,x.hasta,x.responsableNombre,x.responsableEmail,x.estatus,...(D.assignmentSelections?.[x.id]?.folios||[])].join(' ')).includes(q));
      v.querySelector('#hs104RespBody').innerHTML=filtered.length?filtered.map(x=>{const det=D.assignmentSelections?.[x.id]||{};const folios=Array.isArray(det.folios)?det.folios:[];const rango=folios.length>1&&folios.every((f,i)=>i===0||Number(String(f).split('-').pop())===Number(String(folios[i-1]).split('-').pop())+1);const label=folios.length?(folios.length===1?folios[0]:(rango?folios[0]+' → '+folios[folios.length-1]:folios.length+' hojas seleccionadas')):(esc(x.serie)+'-'+esc(x.anio)+' · '+six(x.desde)+' → '+six(x.hasta));return '<tr><td>'+esc(label)+'</td><td><strong>'+esc(x.responsableNombre)+'</strong><div class="hs104-note">'+esc(x.responsableEmail||'Sin correo')+'</div></td><td>'+esc(x.estatus)+'</td><td>'+fmt(x.aceptadoAt)+'</td><td><div class="hs104-actions"><button type="button" class="cc-btn cc-btn-light" data-edit-resp-assign="'+esc(x.id)+'"><i class="fa-solid fa-pen"></i> Editar</button>'+(x.estatus==='ACEPTADA'?'<span class="hs104-pill hs104-ok">Aceptada</span>':'<button class="cc-btn cc-btn-light" data-accept="'+esc(x.id)+'">Aceptar manual</button><button class="cc-btn cc-btn-primary" data-resend="'+esc(x.id)+'">Reenviar enlace</button>')+'</div></td></tr>'}).join(''):'<tr><td colspan="5" style="text-align:center;padding:20px">Sin resultados.</td></tr>';
      v.querySelectorAll('[data-edit-resp-assign]').forEach(b=>b.onclick=()=>openEditResponsible(rows.find(x=>String(x.id)===String(b.dataset.editRespAssign))));
      v.querySelectorAll('[data-accept]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Aceptar manualmente esta asignación?'))return;try{await rpc('hs_accept_assignment_manual',{p_asignacion_id:b.dataset.accept});await load()}catch(e){alert(e.message||e)}});
      v.querySelectorAll('[data-resend]').forEach(b=>b.onclick=()=>reissue(b.dataset.resend));
    };
    v.querySelector('#hs104RespSearch').oninput=draw;
    v.querySelector('#hs104AssignResp').onclick=openAssignResponsible;
    draw();
  }
  function openEditResponsible(x){
    if(!x)return;
    if(!perm('asignar_responsable'))return alert('Sin permiso.');
    const rs=active(D.responsables);
    modal('Editar responsable · '+x.serie+'-'+x.anio+' '+six(x.desde)+' → '+six(x.hasta),'<form><div class="cc-field"><label>Responsable *</label><select name="responsableId" required>'+options(rs,r=>r.nombre+(r.numeroEmpleado?' · '+r.numeroEmpleado:'')+(r.correo?' · '+r.correo:''),x.responsableId||'')+'</select></div><div class="hs104-note" style="margin-top:8px">Se actualizará el responsable del rango y de sus folios relacionados. Si algún folio del rango ya fue utilizado, Supabase bloqueará el cambio.</div><div class="hs104-actions" style="margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar responsable</button></div></form>',{onSave:async fd=>{await rpc('hs_edit_responsible_assignment',{p_item:{asignacionId:x.id,responsableId:fd.get('responsableId')}})}});
  }
  function openAssignResponsible(){
    if(!perm('asignar_responsable'))return alert('Sin permiso.');
    const rs=active(D.responsables),ss=active(D.series),ys=active(D.anios);
    if(!rs.length)return alert('Primero agrega un responsable en Catálogos.');
    const body='<form><div class="hs104-grid">'+
      '<div class="cc-field"><label>Serie *</label><select name="serieId" required>'+options(ss,x=>x.codigo)+'</select></div>'+
      '<div class="cc-field"><label>Año *</label><select name="anioId" required>'+options(ys,x=>x.anio)+'</select></div>'+
      '<div class="cc-field"><label>Responsable *</label><select name="responsableId" required>'+options(rs,x=>x.nombre+(x.numeroEmpleado?' · '+x.numeroEmpleado:'')+(x.correo?' · '+x.correo:''))+'</select></div>'+
      '<div class="cc-field"><label>Forma de asignación *</label><select name="modo"><option value="RANGO">Por rango</option><option value="INDIVIDUAL">Hoja individual</option><option value="VARIOS">Varias hojas</option></select></div>'+
      '</div>'+
      '<div data-assign-mode="RANGO" class="hs104-grid" style="margin-top:10px"><div class="cc-field"><label>Desde *</label><input name="desde" inputmode="numeric" maxlength="6" placeholder="Ej. 12751 ó 012751"><div class="hs104-note">Acepta 5 dígitos o 6 posiciones con cero inicial.</div></div><div class="cc-field"><label>Hasta *</label><input name="hasta" inputmode="numeric" maxlength="6" placeholder="Ej. 12780 ó 012780"><div class="hs104-note">Acepta 5 dígitos o 6 posiciones con cero inicial.</div></div></div>'+
      '<div data-assign-mode="INDIVIDUAL" style="display:none;margin-top:10px"><div class="cc-field"><label>Folio *</label><input name="individual" inputmode="numeric" maxlength="5" placeholder="5 dígitos"></div></div>'+
      '<div data-assign-mode="VARIOS" style="display:none;margin-top:10px"><div class="cc-field"><label>Varias hojas *</label><input name="varios" inputmode="numeric" placeholder="Escribe 5 dígitos y presiona coma o Enter"><div class="hs104-note">Cada hoja se agrega como etiqueta y puedes quitarla con ×.</div></div><div data-assign-chips style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"></div></div>'+
      '<div data-assign-status class="hs104-note" style="margin-top:10px">Captura las hojas para validar disponibilidad.</div>'+
      '<div class="hs104-actions" style="margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Validar y asignar</button></div></form>';
    const o=modal('Asignar hojas a responsable',body,{onSave:async(fd,form)=>{
      const item=selectionItem(form);
      item.serieId=String(fd.get('serieId')||'');item.anioId=String(fd.get('anioId')||'');item.responsableId=String(fd.get('responsableId')||'');item.hours=168;
      const check=await rpc('hs_validate_responsible_selection',{p_item:item});
      if(!check.available)throw new Error(conflictText(check.conflicts,'No se puede asignar. Hojas con conflicto:'));
      const r=await rpc('hs_create_responsible_assignment_selection',{p_item:item});
      await sendAssignmentEmail(r.id,r.token);
    }});
    setupSelectionUI(o,'responsable');
  }
  function conflictText(xs,prefix){
    const rows=Array.isArray(xs)?xs:[];
    return prefix+' '+rows.map(x=>String(x.consecutivo).padStart(5,'0')+' ['+(x.estatus||'NO DISPONIBLE')+']'+(x.responsable?' · '+x.responsable:'')+(x.persona?' · '+x.persona:'')).join(', ');
  }
  function selectionItem(form){
    const modo=String(form.modo?.value||'RANGO');
    const item={modo};
    if(modo==='RANGO'){
      const normalizeRangeFolio=value=>{
        let n=String(value||'').replace(/\\D/g,'');
        if(n.length===6&&n.startsWith('0'))n=n.slice(1);
        return n;
      };
      const ds=normalizeRangeFolio(form.desde?.value),hs=normalizeRangeFolio(form.hasta?.value);
      if(!/^\\d{5}$/.test(ds)||!/^\\d{5}$/.test(hs))throw new Error('Desde y Hasta deben tener 5 dígitos, o 6 posiciones cuando incluyen cero inicial.');
      item.desde=Number(ds);item.hasta=Number(hs);
      if(item.hasta<item.desde)throw new Error('Hasta no puede ser menor que Desde.');
    }else if(modo==='INDIVIDUAL'){
      const raw=String(form.individual?.value||'').trim();
      if(!/^\\d{5}$/.test(raw))throw new Error('El folio individual debe tener exactamente 5 dígitos.');
      item.individual=Number(raw);
    }else{
      const nums=[...(form.__assignSet||[])];
      if(!nums.length)throw new Error('Agrega al menos una hoja.');
      item.folios=nums.map(Number);
    }
    return item;
  }
  function setupSelectionUI(o,kind){
    const form=o.querySelector('form'),status=o.querySelector('[data-assign-status]'),chips=o.querySelector('[data-assign-chips]'),varios=form.varios;
    form.__assignSet=new Set();
    const renderChips=()=>{
      if(!chips)return;
      chips.innerHTML=[...form.__assignSet].map(n=>'<span style="display:inline-flex;align-items:center;gap:7px;background:#e2e8f0;border-radius:999px;padding:6px 10px;font-weight:800">'+esc(n)+'<button type="button" data-assign-chip="'+esc(n)+'" style="border:0;background:transparent;cursor:pointer;font-size:16px;line-height:1">×</button></span>').join('');
      chips.querySelectorAll('[data-assign-chip]').forEach(b=>b.onclick=()=>{form.__assignSet.delete(String(b.dataset.assignChip));renderChips();validate();});
    };
    const payload=()=>{const item=selectionItem(form);if(kind==='responsable'){item.serieId=form.serieId.value;item.anioId=form.anioId.value;}else item.asignacionId=form.asignacionId.value;return item;};
    let seq=0;
    const validate=async()=>{
      const my=++seq;
      try{
        const item=payload();
        status.textContent='Validando disponibilidad…';status.style.color='#64748b';
        const r=await rpc(kind==='responsable'?'hs_validate_responsible_selection':'hs_validate_person_selection',{p_item:item});
        if(my!==seq)return;
        if(r.available){status.textContent='✓ '+Number(r.total||0)+' hoja(s) disponibles para asignar.';status.style.color='#15803d';}
        else{status.textContent=conflictText(r.conflicts,'✕ Conflicto:');status.style.color='#b91c1c';}
      }catch(e){if(my!==seq)return;status.textContent=e.message||e;status.style.color='#b91c1c';}
    };
    const process=()=>{
      const parts=String(varios?.value||'').split(/[\\s,]+/).filter(Boolean);if(!parts.length)return;
      varios.value='';
      for(const p of parts){
        const n=String(p).replace(/\\D/g,'');
        if(n.length!==5){status.textContent='El folio '+p+' debe tener exactamente 5 dígitos.';status.style.color='#b91c1c';return;}
        form.__assignSet.add(n);
      }
      renderChips();validate();
    };
    form.modo.onchange=()=>{
      o.querySelectorAll('[data-assign-mode]').forEach(x=>x.style.display=x.dataset.assignMode===form.modo.value?'':'none');
      form.__assignSet.clear();renderChips();
      ['desde','hasta','individual','varios'].forEach(n=>{if(form[n])form[n].value='';});
      status.textContent='Captura las hojas para validar disponibilidad.';status.style.color='#64748b';
    };
    ['desde','hasta'].forEach(n=>form[n]?.addEventListener('input',()=>{form[n].value=form[n].value.replace(/\\D/g,'').slice(0,6);const v=form[n].value;if(v.length===5||(v.length===6&&v.startsWith('0')))validate();}));
    form.individual?.addEventListener('input',()=>{form.individual.value=form.individual.value.replace(/\\D/g,'').slice(0,5);if(form.individual.value.length===5)validate();});
    varios?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===','){e.preventDefault();process();}});
    varios?.addEventListener('input',()=>{varios.value=varios.value.replace(/[^0-9,\\s]/g,'');if(/^\\d{5}$/.test(varios.value.trim()))process();});
    form.serieId?.addEventListener('change',()=>{form.__assignSet.clear();renderChips();if((form.individual?.value||'').length===5)validate();});
    form.anioId?.addEventListener('change',()=>{form.__assignSet.clear();renderChips();if((form.individual?.value||'').length===5)validate();});
    form.asignacionId?.addEventListener('change',()=>{form.__assignSet.clear();renderChips();status.textContent='Selecciona hojas de esta custodia.';status.style.color='#64748b';});
  }

  async function reissue(id){try{const r=await rpc('hs_reissue_assignment_link',{p_asignacion_id:id});if(r.aceptada)return alert('La asignación ya fue aceptada.');await sendAssignmentEmail(id,r.token)}catch(e){alert(e.message||e)}}

  function renderOperadores(){
    const v=view();if(!v)return;
    v.innerHTML='<div class="hs104-card"><div class="cc-toolbar"><div><strong>Folios entregados</strong><div class="hs104-note">Entrega hojas a Operadores o Beneficiarios y corrige asignaciones activas.</div></div><div class="hs104-actions"><select id="hs104OpType" class="cc-input"><option value="OPERADOR">Operadores</option><option value="BENEFICIARIO">Beneficiarios</option></select><input id="hs104OpSearch" class="cc-input" type="search" placeholder="Buscar persona..."><button class="cc-btn cc-btn-primary" id="hs104AssignOp">Asignar hojas</button></div></div><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>FOLIO</th><th>PERSONA</th><th>RESPONSABLE</th><th>FECHA</th><th>ESTATUS</th><th>ACCIONES</th></tr></thead><tbody id="hs104OpBody"></tbody></table></div></div>';
    const draw=()=>{const t=v.querySelector('#hs104OpType').value,q=norm(v.querySelector('#hs104OpSearch').value);const rows=(D.asignacionesOperador||[]).filter(x=>String(x.tipoPersona||'OPERADOR')===t).filter(x=>!q||norm(x.persona||x.beneficiario||x.operador).includes(q));v.querySelector('#hs104OpBody').innerHTML=rows.length?rows.map(x=>{const editable=['ACTIVA','ACTIVO'].includes(String(x.estatus||'').toUpperCase());return '<tr><td><strong>'+esc(x.folio)+'</strong></td><td>'+esc(x.persona||x.beneficiario||x.operador||'—')+'</td><td>'+esc(x.responsable||'—')+'</td><td>'+fmt(x.fecha)+'</td><td>'+esc(x.estatus||'ACTIVA')+'</td><td>'+(editable?'<button type="button" class="cc-btn cc-btn-light" data-edit-op="'+esc(x.id)+'"><i class="fa-solid fa-pen"></i> Editar</button>':'<span class="hs104-note">Sin edición</span>')+'</td></tr>'}).join(''):'<tr><td colspan="6" style="text-align:center;padding:20px">Sin resultados.</td></tr>';v.querySelectorAll('[data-edit-op]').forEach(b=>b.onclick=()=>openEditOperator((D.asignacionesOperador||[]).find(x=>String(x.id)===String(b.dataset.editOp))))};
    v.querySelector('#hs104OpType').onchange=draw;v.querySelector('#hs104OpSearch').oninput=draw;v.querySelector('#hs104AssignOp').onclick=openAssignPerson;draw();
  }
  async function openEditOperator(x){
    if(!x)return;
    try{const b=await rpc('cc_hojas_beneficiarios_web');D.beneficiarios=Array.isArray(b)?b:[]}catch(e){console.warn('Beneficiarios Web',e);}
    if(!perm('asignar_operador'))return alert('Sin permiso.');
    const currentType=String(x.tipoPersona||'OPERADOR').toUpperCase()==='BENEFICIARIO'?'BENEFICIARIO':'OPERADOR';
    const body='<form><div class="hs104-grid"><div class="cc-field"><label>Tipo *</label><select name="tipoPersona"><option value="OPERADOR" '+(currentType==='OPERADOR'?'selected':'')+'>Operador</option><option value="BENEFICIARIO" '+(currentType==='BENEFICIARIO'?'selected':'')+'>Beneficiario</option></select></div><div class="cc-field"><label>Persona *</label><select name="personaId" required></select></div></div><div class="cc-field"><label>Observaciones</label><textarea name="observaciones">'+esc(x.observaciones||'')+'</textarea></div><div class="hs104-note">Solo se puede corregir mientras la hoja siga pendiente de comprobación.</div><div class="hs104-actions" style="margin-top:14px"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar asignación</button></div></form>';
    const o=modal('Editar asignación · '+x.folio,body,{onSave:async fd=>{await rpc('hs_edit_operator_assignment',{p_item:{asignacionId:x.id,tipoPersona:fd.get('tipoPersona'),personaId:fd.get('personaId'),observaciones:fd.get('observaciones')}})}});
    const form=o.querySelector('form'),sel=form.personaId;
    const fill=()=>{const t=form.tipoPersona.value,xs=t==='BENEFICIARIO'?active(D.beneficiarios):active(D.operadores);let selected='';if(t===currentType){if(t==='BENEFICIARIO')selected=x.beneficiarioId||'';else selected=(D.operadores||[]).find(z=>norm(z.nombre)===norm(x.operador||x.persona))?.id||'';}sel.innerHTML=options(xs,z=>z.nombre+(z.numeroEmpleado?' · '+z.numeroEmpleado:''),selected)};
    form.tipoPersona.onchange=fill;fill();
  }
  async function openAssignPerson(){
    if(!perm('asignar_operador'))return alert('Sin permiso.');
    try{const b=await rpc('cc_hojas_beneficiarios_web');D.beneficiarios=Array.isArray(b)?b:[]}catch(e){console.warn('Beneficiarios Web',e);D.beneficiarios=[]}
    const aa=(D.asignacionesResponsable||[]).filter(x=>x.estatus==='ACEPTADA');
    if(!aa.length)return alert('No hay custodias aceptadas por responsables.');

    const body='<form><div class="hs104-grid">'+
      '<div class="cc-field"><label>Tipo *</label><select name="tipoPersona"><option value="OPERADOR">Operador</option><option value="BENEFICIARIO">Beneficiario</option></select></div>'+
      '<div class="cc-field"><label>Operador / Beneficiario *</label><div style="position:relative"><div style="display:flex;gap:6px;align-items:center"><input name="personaNombre" type="search" autocomplete="off" placeholder="Escribe mínimo 3 letras..." style="flex:1" required><button type="button" class="cc-btn cc-btn-light" data-person-more title="Buscar en catálogo">...</button></div><div data-person-suggestions style="display:none;position:absolute;left:0;right:42px;top:100%;z-index:20;background:#fff;border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 10px 24px #0f172a22;max-height:220px;overflow:auto;margin-top:4px"></div></div><input name="personaId" type="hidden"><div class="hs104-note" data-person-status>Escribe mínimo 3 letras y selecciona una opción.</div></div>'+
      '<div class="cc-field"><label>Custodia *</label><select name="asignacionId" required>'+options(aa,x=>x.responsableNombre+' · '+x.serie+'-'+x.anio+' · '+((D.assignmentSelections?.[x.id]?.cantidad)||0)+' hoja(s)')+'</select></div>'+
      '<div class="cc-field"><label>Forma de asignación *</label><select name="modo"><option value="RANGO">Por rango</option><option value="INDIVIDUAL">Hoja individual</option><option value="VARIOS">Varias hojas</option></select></div>'+
      '</div>'+
      '<div data-assign-mode="RANGO" class="hs104-grid" style="margin-top:10px"><div class="cc-field"><label>Desde *</label><input name="desde" inputmode="numeric" maxlength="5" placeholder="5 dígitos"></div><div class="cc-field"><label>Hasta *</label><input name="hasta" inputmode="numeric" maxlength="5" placeholder="5 dígitos"></div></div>'+
      '<div data-assign-mode="INDIVIDUAL" style="display:none;margin-top:10px"><div class="cc-field"><label>Folio *</label><input name="individual" inputmode="numeric" maxlength="5" placeholder="5 dígitos"></div></div>'+
      '<div data-assign-mode="VARIOS" style="display:none;margin-top:10px"><div class="cc-field"><label>Varias hojas *</label><input name="varios" inputmode="numeric" placeholder="Escribe 5 dígitos y presiona coma o Enter"></div><div data-assign-chips style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"></div></div>'+
      '<div data-assign-status class="hs104-note" style="margin-top:8px">Captura las hojas para validar disponibilidad dentro de la custodia.</div>'+
      '<div class="cc-field"><label>Observaciones</label><textarea name="observaciones"></textarea></div>'+
      '<div class="hs104-actions"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Validar y asignar hojas</button></div></form>';

    const o=modal('Asignar hojas a operador / beneficiario',body,{onSave:async(fd,form)=>{
      const personId=String(fd.get('personaId')||'').trim();
      if(!personId)throw new Error('Selecciona un operador o beneficiario válido del catálogo.');
      const item=selectionItem(form);
      item.asignacionId=String(fd.get('asignacionId')||'');
      item.tipoPersona=String(fd.get('tipoPersona')||'OPERADOR');
      item.personaId=personId;item.operadorId=personId;item.observaciones=String(fd.get('observaciones')||'');
      const check=await rpc('hs_validate_person_selection',{p_item:item});
      if(!check.available)throw new Error(conflictText(check.conflicts,'No se puede asignar. Hojas con conflicto:'));
      const r=await rpc('hs_assign_person_selection',{p_item:item});
      alert('Hojas asignadas: '+Number(r.asignados||0)+' · '+(r.persona||''));
    }});

    const form=o.querySelector('form'),personInput=form.personaNombre,personId=form.personaId,personStatus=o.querySelector('[data-person-status]'),personMore=o.querySelector('[data-person-more]'),personSuggestions=o.querySelector('[data-person-suggestions]');
    function currentPeople(){return form.tipoPersona.value==='BENEFICIARIO'?active(D.beneficiarios):active(D.operadores)}
    function personLabel(x){return String(x.nombre||'')+(x.numeroEmpleado?' · '+x.numeroEmpleado:'')+(x.email?' · '+x.email:'')}
    function hideSuggestions(){if(personSuggestions){personSuggestions.style.display='none';personSuggestions.innerHTML='';}}
    function clearPerson(){personId.value='';personInput.value='';personStatus.textContent='Escribe mínimo 3 letras y selecciona una opción.';personStatus.style.color='#64748b';hideSuggestions();}
    function choosePerson(x){personId.value=String(x.id);personInput.value=personLabel(x);personStatus.textContent='Seleccionado';personStatus.style.color='#15803d';hideSuggestions();}
    function renderSuggestions(){
      const q=norm(personInput.value.trim());
      personId.value='';
      if(q.length<3){personStatus.textContent='Escribe mínimo 3 letras y selecciona una opción.';personStatus.style.color='#64748b';hideSuggestions();return;}
      const hits=currentPeople().filter(x=>norm(personLabel(x)).includes(q)||norm(x.nombre).includes(q)).slice(0,12);
      if(!hits.length){personStatus.textContent='Sin coincidencias.';personStatus.style.color='#b91c1c';hideSuggestions();return;}
      personStatus.textContent='Selecciona una opción de la lista.';personStatus.style.color='#64748b';
      personSuggestions.innerHTML=hits.map(x=>'<button type="button" data-suggest-person="'+esc(x.id)+'" style="display:block;width:100%;border:0;background:#fff;padding:9px 10px;text-align:left;cursor:pointer;border-bottom:1px solid #eef2f7">'+esc(personLabel(x))+'</button>').join('');
      personSuggestions.style.display='block';
      personSuggestions.querySelectorAll('[data-suggest-person]').forEach(b=>b.onclick=()=>{const x=currentPeople().find(z=>String(z.id)===String(b.dataset.suggestPerson));if(x)choosePerson(x);});
    }
    function openPersonPicker(){
      document.getElementById('hs104PersonPicker')?.remove();
      const ov=document.createElement('div');ov.id='hs104PersonPicker';
      ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:101400;display:flex;align-items:center;justify-content:center;padding:14px';
      ov.innerHTML='<div style="width:min(680px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 24px 70px #0005"><div style="padding:13px 15px;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center"><strong>Buscar '+(form.tipoPersona.value==='BENEFICIARIO'?'beneficiario':'operador')+'</strong><button type="button" data-x style="border:0;background:none;color:#fff;font-size:24px">×</button></div><div style="padding:14px"><input data-q type="search" class="cc-input" placeholder="Escribe mínimo 3 letras..." style="width:100%;margin-bottom:10px"><div data-list></div></div></div>';
      document.body.appendChild(ov);
      const q=ov.querySelector('[data-q]'),list=ov.querySelector('[data-list]'),close=()=>ov.remove();
      const paint=()=>{const n=norm(q.value),xs=currentPeople().filter(x=>n.length<3||norm(personLabel(x)).includes(n)||norm(x.nombre).includes(n));list.innerHTML=xs.length?xs.slice(0,100).map(x=>'<button type="button" class="cc-btn cc-btn-light" data-person-id="'+esc(x.id)+'" style="display:block;width:100%;text-align:left;margin:5px 0">'+esc(personLabel(x))+'</button>').join(''):'<div class="hs104-note">Sin coincidencias.</div>';list.querySelectorAll('[data-person-id]').forEach(b=>b.onclick=()=>{const x=currentPeople().find(z=>String(z.id)===String(b.dataset.personId));if(x){choosePerson(x);close();}});};
      q.oninput=paint;ov.querySelector('[data-x]').onclick=close;ov.onclick=e=>{if(e.target===ov)close()};paint();q.focus();
    }
    form.tipoPersona.onchange=clearPerson;
    personInput.addEventListener('input',renderSuggestions);
    personInput.addEventListener('keydown',e=>{if(e.key==='Escape')hideSuggestions();});
    personInput.addEventListener('blur',()=>setTimeout(hideSuggestions,150));
    personMore.onclick=openPersonPicker;
    clearPerson();setupSelectionUI(o,'persona');
  }

  function clientLabel(x){return String(x?.nombre||'')+(x?.razonSocial&&x.razonSocial!==x.nombre?' · '+x.razonSocial:'');}
  function activeClients(){return active(D.clientes||[]);}
  function openClientPicker(row){
    document.getElementById('hs104ClientPicker')?.remove();
    const ov=document.createElement('div');ov.id='hs104ClientPicker';
    ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:101300;display:flex;align-items:center;justify-content:center;padding:14px';
    ov.innerHTML='<div style="width:min(650px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 24px 70px #0005"><div style="padding:13px 15px;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center"><strong>Buscar cliente</strong><button type="button" data-x style="border:0;background:none;color:#fff;font-size:24px">×</button></div><div style="padding:14px"><input data-q type="search" class="cc-input" placeholder="Buscar cliente..." style="width:100%;margin-bottom:10px"><div data-list></div></div></div>';
    document.body.appendChild(ov);
    const close=()=>ov.remove(),q=ov.querySelector('[data-q]'),list=ov.querySelector('[data-list]');
    const choose=x=>{const sel=row.querySelector('[data-cliente]'),inp=row.querySelector('[data-cliente-search]'),st=row.querySelector('[data-cliente-status]');sel.value=String(x.id);inp.value=clientLabel(x);sel.dispatchEvent(new Event('change',{bubbles:true}));if(st){st.textContent='✓ '+clientLabel(x);st.style.color='#15803d';}close();};
    const paint=()=>{const n=norm(q.value),xs=activeClients().filter(x=>!n||norm(clientLabel(x)).includes(n));list.innerHTML=xs.length?xs.map(x=>'<button type="button" class="cc-btn cc-btn-light" data-client-id="'+esc(x.id)+'" style="display:block;width:100%;text-align:left;margin:5px 0">'+esc(clientLabel(x))+'</button>').join(''):'<div class="hs104-note">Sin coincidencias.</div>';list.querySelectorAll('[data-client-id]').forEach(b=>b.onclick=()=>{const x=activeClients().find(z=>String(z.id)===String(b.dataset.clientId));if(x)choose(x);});};
    q.oninput=paint;ov.querySelector('[data-x]').onclick=close;ov.onclick=e=>{if(e.target===ov)close()};paint();q.focus();
  }

  function personType(x){return String(x.tipoPersona||'OPERADOR').toUpperCase()==='BENEFICIARIO'?'BENEFICIARIO':'OPERADOR'}
  function personName(x){return personType(x)==='BENEFICIARIO'?(x.beneficiario||x.beneficiarioNombre||x.operador||''):(x.operador||'')}
  function renderComprobacion(){
    const v=view();if(!v)return;v.innerHTML='<div class="hs104-card"><div class="cc-toolbar"><div><strong>Comprobación de hojas</strong><div class="hs104-note">Localiza y procesa cualquier hoja pendiente sin cambiar de operador.</div></div><div class="hs104-actions"><button type="button" class="cc-btn cc-btn-light" id="hs104CompRefresh"><i class="fa-solid fa-rotate"></i> Actualizar</button></div></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 10px"><input id="hs104CompGlobal" class="cc-input" type="search" autocomplete="off" placeholder="Buscar folio, operador, beneficiario, cliente, unidad o remolque…" style="flex:1;min-width:280px"><select id="hs104CompFilter" class="cc-input"><option value="TODAS">Todas</option><option value="PRECARGADA">Precargadas</option><option value="PENDIENTE">Sin captura</option><option value="OPERADOR">Operadores</option><option value="BENEFICIARIO">Beneficiarios</option></select><select id="hs104CompType" class="cc-input" style="display:none"><option value="OPERADOR">Operadores</option><option value="BENEFICIARIO">Beneficiarios</option></select><input id="hs104CompPersonSearch" style="display:none"><datalist id="hs104CompPersonList"></datalist><select id="hs104CompPerson" style="display:none"></select></div><div id="hs104CompKpis" class="hs104-comp-kpis"></div><div id="hs104CompList"></div></div><div class="hs104-card" style="margin-top:12px"><div class="cc-toolbar"><strong>Historial de comprobaciones</strong></div><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>FOLIO</th><th>FECHA USO</th><th>CLIENTE</th><th>PERSONA</th><th>UNIDAD</th><th>REMOLQUE</th><th>TIPO SERVICIO</th><th>CLASIFICACIÓN</th><th>COMENTARIOS</th><th>ACEPTADO POR</th><th>ESTATUS</th><th>FACTURA</th><th>ACCIONES</th></tr></thead><tbody id="hs104Hist"></tbody></table></div></div>';
    if(!document.getElementById('hs104CompProCss')){const s=document.createElement('style');s.id='hs104CompProCss';s.textContent=`
#hs104CompList .hs104-row{display:block!important}#hs104CompList .hs-list-row{margin:0 0 7px!important;border:1px solid #e2e8f0!important;border-radius:11px!important;padding:10px 12px!important;box-shadow:none!important}#hs104CompList .hs-list-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important}#hs104CompList .hs-list-info strong{font-size:13px!important}#hs104CompList .hs-list-head-actions{display:flex!important;align-items:center!important;gap:6px!important;flex-wrap:nowrap!important}.hs104-comp-kpis{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 10px}.hs104-comp-kpi{border:1px solid #e2e8f0;border-radius:10px;padding:7px 10px;background:#fff;font-size:10px;font-weight:800}.hs104-comp-kpi b{font-size:15px;margin-right:4px}.hs104-comp-kpi.ready{background:#f0fdf4;border-color:#bbf7d0;color:#166534}.hs104-comp-kpi.pending{background:#fff7ed;border-color:#fed7aa;color:#9a3412}#hs104CompList .hs-list-dialog{width:min(760px,97vw)!important;border-radius:16px!important;overflow:hidden!important}#hs104CompList .hs-list-dialog-head{background:#0f172a!important;padding:14px 16px!important}#hs104CompList .hs-list-dialog-body{padding:14px!important}#hs104CompList .hs-manual-photo-box{border:1px solid #e2e8f0!important;border-radius:12px!important;background:#f8fafc!important;padding:12px!important;margin-bottom:12px!important}#hs104CompList .hs104-grid{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px!important;gap:10px!important}#hs104CompList [data-obs]{min-height:70px}#hs104CompList .hs104-actions{position:sticky;bottom:0;background:#fff;border-top:1px solid #e2e8f0;padding:10px 0 0!important;margin-top:10px!important;justify-content:flex-end!important}#hs104CompList [data-save]{font-weight:900!important;min-width:180px!important}@media(max-width:700px){#hs104CompList .hs-list-head{display:grid!important;grid-template-columns:1fr!important}#hs104CompList .hs-list-head-actions{display:grid!important;grid-template-columns:1fr 1fr!important}#hs104CompList .hs-list-head-actions .hs104-pill{grid-column:1/-1;width:max-content}#hs104CompList .hs104-grid{grid-template-columns:1fr!important}.hs104-comp-kpis{display:grid;grid-template-columns:1fr 1fr}#hs104CompList [data-save]{width:100%!important}}`;document.head.appendChild(s)}
    const type=v.querySelector('#hs104CompType'),person=v.querySelector('#hs104CompPerson'),personSearch=v.querySelector('#hs104CompPersonSearch'),personList=v.querySelector('#hs104CompPersonList');
    const syncPersonFromSearch=()=>{const q=norm(personSearch.value),opts=[...person.options].filter(o=>o.value);if(!q){person.value='';person.dispatchEvent(new Event('change',{bubbles:true}));return;}let match=opts.find(o=>norm(o.textContent)===q);if(!match){const starts=opts.filter(o=>norm(o.textContent).startsWith(q));if(starts.length===1)match=starts[0];}if(!match){const contains=opts.filter(o=>norm(o.textContent).includes(q));if(contains.length===1)match=contains[0];}if(match){person.value=match.value;personSearch.value=match.textContent.trim();person.dispatchEvent(new Event('change',{bubbles:true}));}};
    const fillPeople=()=>{const t=type.value, rows=(D.foliosAsignadosOperador||[]).filter(x=>personType(x)===t),map=new Map();rows.forEach(x=>{const id=t==='BENEFICIARIO'?x.beneficiarioId:x.operadorId;if(id&&!map.has(String(id)))map.set(String(id),{id,name:personName(x),count:0});if(id)map.get(String(id)).count++});const people=[...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'es'));person.innerHTML='<option value="">Seleccionar '+(t==='BENEFICIARIO'?'beneficiario':'operador')+'…</option>'+people.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' · '+p.count+' pendiente(s)</option>').join('');personList.innerHTML=people.map(p=>'<option value="'+esc(p.name+' · '+p.count+' pendiente(s)')+'"></option>').join('');personSearch.value='';personSearch.placeholder=t==='BENEFICIARIO'?'Buscar beneficiario...':'Buscar operador...';drawCards();drawHist()};
    const drawCards=()=>{
      const list=v.querySelector('#hs104CompList'),q=norm(v.querySelector('#hs104CompGlobal')?.value||''),f=v.querySelector('#hs104CompFilter')?.value||'TODAS';
      if(list.querySelector('.hs-list-modal-open'))document.body.style.overflow='';
      const all=(D.foliosAsignadosOperador||[]),ready=all.filter(x=>!!x.precaptura).length;const k=v.querySelector('#hs104CompKpis');if(k)k.innerHTML='<div class="hs104-comp-kpi"><b>'+all.length+'</b> Pendientes</div><div class="hs104-comp-kpi ready"><b>'+ready+'</b> Precargadas</div><div class="hs104-comp-kpi pending"><b>'+(all.length-ready)+'</b> Sin captura</div>';const rows=all.filter(x=>{const pre=x.precaptura,pt=personType(x);if(f==='PRECARGADA'&&!pre)return false;if(f==='PENDIENTE'&&pre)return false;if((f==='OPERADOR'||f==='BENEFICIARIO')&&pt!==f)return false;const hay=norm([x.folio,personName(x),pt,x.responsable,pre?.cliente,pre?.tipoViaje,pre?.clasificacion,x.unidad,x.unidadNumero,x.remolque,x.remolqueNumero].filter(Boolean).join(' '));return !q||hay.includes(q)});
      if(!rows.length){list.innerHTML='<div style="padding:28px;text-align:center;color:#64748b">No hay hojas pendientes con esta búsqueda o filtro.</div>';return;}
      list.innerHTML='<div class="hs104-row">'+rows.map(x=>{
        const pre=x.precaptura;
        return `
        <div class="hs104-card hs-list-row" data-row="${esc(x.id)}" data-hs-folio="${esc(x.folio)}" data-hs-person="${esc(personName(x))}" data-hs-person-type="${esc(personType(x))}" data-hs-beneficiary="${personType(x)==='BENEFICIARIO'?esc(x.beneficiarioId||'1'):''}">
          <div class="hs-list-head">
            <div class="hs-list-info"><strong>${esc(x.folio)}</strong><div class="hs104-note">${esc(personName(x))} · ${pre?esc([pre.cliente,pre.tipoViaje,pre.clasificacion].filter(Boolean).join(' · ')||'Datos precargados'):esc(x.responsable||'—')}</div></div>
            <div class="hs-list-head-actions"><span class="hs104-pill ${pre?'hs104-ok':'hs104-danger'}">${pre?'LISTA / PRECARGADA':'PENDIENTE'}</span><button type="button" class="cc-btn ${pre?'cc-btn-primary':'cc-btn-light'}" data-hs-edit aria-haspopup="dialog"><i class="fa-solid ${pre?'fa-clipboard-check':'fa-pen'}"></i> ${pre?'Revisar':'Completar'}</button><button type="button" class="cc-btn cc-btn-light" data-return><i class="fa-solid fa-rotate-left"></i> Registrar sin usar</button></div>
          </div>
          <div class="hs-list-edit-area" role="dialog" aria-modal="true" aria-label="${pre?'Revisar y comprobar':'Editar'} hoja ${esc(x.folio)}">
            <div class="hs-list-dialog"><div class="hs-list-dialog-head"><div><div style="font-size:10px;opacity:.72;font-weight:800">COMPROBACIÓN DE HOJA</div><strong style="font-size:16px">${esc(x.folio)}</strong><div style="font-size:11px;opacity:.82;margin-top:2px">${esc(personName(x))}</div></div><button type="button" class="hs-list-dialog-close" data-hs-close aria-label="Cerrar">×</button></div>
              <div class="hs-list-dialog-body"><div style="padding:9px 11px;margin-bottom:12px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;font-size:11px"><b>${pre?'Precarga recibida · lista para revisar':'Captura pendiente'}</b><div>${pre?'Revisa la evidencia y confirma los datos antes de comprobar.':'Completa los datos obligatorios para comprobar la hoja.'}</div></div>
                <div class="hs-manual-photo-box" data-hs-manual-photo-box="1" data-photo-path=""><label>Evidencia fotográfica</label><div class="hs-photo-methods"><button type="button" class="cc-btn cc-btn-light" data-upload><i class="fa-solid fa-upload"></i> Subir imagen</button><button type="button" class="cc-btn cc-btn-light" data-qr><i class="fa-solid fa-qrcode"></i> Tomar foto con QR</button><input type="file" accept="image/*" data-file></div><div class="hs-manual-photo-status">Sube una foto o muestra el QR para tomarla desde tu teléfono.</div></div>
                <div style="font-size:10px;font-weight:900;color:#64748b;margin:12px 0 6px">DATOS DEL SERVICIO</div><div class="hs104-grid"><div class="cc-field"><label>Fecha de uso *</label><input data-fecha type="date" value="${today()}"></div><div class="cc-field"><label>Cliente *</label><div style="display:flex;gap:6px;align-items:center"><input data-cliente-search type="search" autocomplete="off" placeholder="Escribe mínimo 3 letras..." style="flex:1"><button type="button" class="cc-btn cc-btn-light" data-cliente-more title="Buscar en catálogo">...</button></div><select data-cliente style="display:none">${options(active(D.clientes||[]),c=>clientLabel(c))}</select><datalist data-cliente-list></datalist><div data-cliente-status class="hs104-note">Escribe 3 letras para buscar o usa … para ver todos.</div></div><div class="cc-field"><label>Tipo de servicio *</label><input data-tipo placeholder="Ej. Exportación, Importación, Cruce..."></div><div class="cc-field"><label>Clasificación *</label><input data-clas placeholder="Ej. Cargado, Vacío, Foráneo..."></div></div>
                <div style="font-size:10px;font-weight:900;color:#64748b;margin:12px 0 6px">CIERRE</div><div class="cc-field"><label>Observaciones</label><textarea data-obs placeholder="Opcional"></textarea></div>
                <div class="hs104-actions"><button type="button" class="cc-btn cc-btn-primary" data-save>Comprobar hoja</button></div>
              </div>
            </div>
          </div>
        </div>`;}).join('')+'</div>';
      list.querySelectorAll('[data-row]').forEach(row=>{
        const area=row.querySelector('.hs-list-edit-area');
        const close=()=>{row.classList.remove('hs-list-modal-open');if(!list.querySelector('.hs-list-modal-open'))document.body.style.overflow='';};
        const clientSel=row.querySelector('[data-cliente]'),clientInput=row.querySelector('[data-cliente-search]'),clientList=row.querySelector('[data-cliente-list]'),clientStatus=row.querySelector('[data-cliente-status]');
        if(clientSel&&clientInput&&clientList){
          const listId='hs104ClientList_'+String(row.dataset.row||'').replace(/[^a-zA-Z0-9_-]/g,'');clientList.id=listId;clientInput.setAttribute('list',listId);
          const syncClientFromSelect=()=>{const x=activeClients().find(z=>String(z.id)===String(clientSel.value));if(x){clientInput.value=clientLabel(x);clientStatus.textContent='✓ '+clientLabel(x);clientStatus.style.color='#15803d';}};
          const syncClient=()=>{const q=clientInput.value.trim(),n=norm(q);if(n.length<3){clientList.innerHTML='';if(!activeClients().some(x=>norm(clientLabel(x))===n)){clientSel.value='';}clientStatus.textContent='Escribe 3 letras para buscar o usa … para ver todos.';clientStatus.style.color='#64748b';return;}const hits=activeClients().filter(x=>norm(clientLabel(x)).includes(n)).slice(0,30);clientList.innerHTML=hits.map(x=>'<option value="'+esc(clientLabel(x))+'"></option>').join('');let m=activeClients().find(x=>norm(clientLabel(x))===n)||activeClients().find(x=>norm(x.nombre)===n);if(!m&&hits.length===1&&norm(clientLabel(hits[0]))===n)m=hits[0];clientSel.value=m?String(m.id):'';clientStatus.textContent=m?'✓ '+clientLabel(m):(hits.length?hits.length+' coincidencia(s). Selecciona una opción válida.':'Sin coincidencias.');clientStatus.style.color=m?'#15803d':(hits.length?'#64748b':'#b91c1c');};
          ['input','change','blur'].forEach(evt=>clientInput.addEventListener(evt,syncClient));
          clientSel.addEventListener('change',syncClientFromSelect);
          row.querySelector('[data-cliente-more]').onclick=()=>openClientPicker(row);
          syncClientFromSelect();
        }
        row.querySelector('[data-hs-edit]').onclick=()=>{list.querySelectorAll('.hs-list-modal-open').forEach(other=>other.classList.remove('hs-list-modal-open'));row.classList.add('hs-list-modal-open');document.body.style.overflow='hidden';window.hsPatchPrecapture?.();setTimeout(()=>{const sel=row.querySelector('[data-cliente]');if(sel)sel.dispatchEvent(new Event('change',{bubbles:true}));},0);};
        row.querySelector('[data-hs-close]').onclick=close;
        area.onclick=e=>{if(e.target===area)close();};
        row.querySelector('[data-save]').onclick=()=>saveUsed(row);
        row.querySelector('[data-return]').onclick=()=>returnBlank(row);
      });
    };
    const drawHist=()=>{const t=type.value,rows=(D.comprobaciones||[]).filter(x=>['UTILIZADA','CANCELADA'].includes(String(x.tipo||'').toUpperCase())).filter(x=>personType(x)===t);v.querySelector('#hs104Hist').innerHTML=rows.length?rows.map(x=>{const cancelled=String(x.tipo||'').toUpperCase()==='CANCELADA';return '<tr data-hs-hist-row="1" data-hs-hist-folio="'+esc(x.folio)+'" data-hs-hist-tipo="'+esc(String(x.tipo||''))+'"'+(cancelled?' style="background:#fff7f7"':'')+'><td><strong>'+esc(x.folio)+'</strong>'+(cancelled?'<div style="margin-top:3px;font-size:10px;font-weight:800;color:#b91c1c">CANCELADA</div>':'')+'</td><td>'+(cancelled?'':esc(x.fechaUso||x.fecha||'—'))+'</td><td>'+(cancelled?'':esc(x.cliente||'—'))+'</td><td>'+(cancelled?'':esc(personName(x)||'—'))+'</td><td>'+(cancelled?'':esc(x.unidad||x.unidadNumero||'—'))+'</td><td>'+(cancelled?'':esc(x.remolque||x.remolqueNumero||'—'))+'</td><td>'+(cancelled?'':esc(x.tipoViaje||x.servicio||'—'))+'</td><td>'+(cancelled?'':esc(x.clasificacion||'—'))+'</td><td style="min-width:220px;white-space:normal">'+esc(x.observaciones||'')+'</td><td><strong>'+esc(x.aceptadoPor||'—')+'</strong></td><td><strong>'+esc(x.estatusFacturacion||'COMPROBADA')+'</strong></td><td>'+esc(x.facturaNumero||'—')+'</td><td class="hs-hist-actions-cell"><div class="hs-hist-actions"><button type="button" class="cc-btn cc-btn-light" data-edit-h><i class="fa-solid fa-pen"></i> Editar</button><button type="button" class="cc-btn cc-btn-light" data-pdf-h><i class="fa-solid fa-file-pdf"></i> PDF</button><span class="hs-hist-evidence-actions"><button type="button" class="cc-btn cc-btn-light" data-photo-h><i class="fa-solid fa-camera"></i> Foto</button><button type="button" class="cc-btn cc-btn-primary" data-qr-h><i class="fa-solid fa-qrcode"></i> QR</button></span></div></td></tr>';}).join(''):'<tr><td colspan="13" style="text-align:center;padding:20px">Sin comprobaciones.</td></tr>'};
    type.onchange=fillPeople;person.onchange=drawCards;v.querySelector('#hs104CompGlobal').addEventListener('input',drawCards);v.querySelector('#hs104CompFilter').addEventListener('change',drawCards);v.querySelector('#hs104CompRefresh').onclick=()=>load().catch(e=>alert(e.message||e));personSearch.addEventListener('change',syncPersonFromSearch);personSearch.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();syncPersonFromSearch();}});personSearch.addEventListener('input',()=>{const q=norm(personSearch.value);if(!q&&person.value){person.value='';person.dispatchEvent(new Event('change',{bubbles:true}));return;}const exact=[...person.options].filter(o=>o.value).find(o=>norm(o.textContent)===q);if(exact&&person.value!==exact.value){person.value=exact.value;person.dispatchEvent(new Event('change',{bubbles:true}));}});fillPeople();drawCards();
  }
  async function saveUsed(row){const val=s=>String(row.querySelector(s)?.value||'').trim(),folioId=row.dataset.row,fechaUso=val('[data-fecha]'),clienteId=val('[data-cliente]'),tipoViaje=val('[data-tipo]'),clasificacion=val('[data-clas]'),observaciones=val('[data-obs]');if(!fechaUso)return alert('Captura la fecha de uso.');if(!clienteId)return alert('Selecciona un cliente.');const clienteActivo=(D.clientes||[]).find(c=>String(c.id)===String(clienteId)&&String(c.estatus||'ACTIVO').toUpperCase()==='ACTIVO');if(!clienteActivo)return alert('Ese cliente está INACTIVO y no puede usarse para comprobar hojas. Selecciona un cliente activo.');if(!tipoViaje)return alert('Captura el Tipo de servicio.');if(!clasificacion)return alert('Captura la Clasificación.');const btn=row.querySelector('[data-save]');btn.disabled=true;try{await rpc('hs_mark_used',{p_item:{folioId,fechaUso,clienteId,tipoViaje,clasificacion,servicio:tipoViaje,observaciones}});await load()}catch(e){alert(e.message||e);btn.disabled=false}}
  async function returnBlank(row){const folioId=row.dataset.row,fecha=String(row.querySelector('[data-fecha]')?.value||today());if(!confirm('¿Confirmas que esta hoja regresó SIN USAR?\n\nVolverá al responsable y podrá asignarse nuevamente.'))return;const btn=row.querySelector('[data-return]');btn.disabled=true;try{await rpc('hs_return_blank',{p_item:{folioId,fecha,observaciones:'Regresada sin usar desde Control de Hojas v104'}});await load()}catch(e){alert(e.message||e);btn.disabled=false}}

  function renderCatalogos(){
    const v=view();if(!v)return;v.innerHTML='<div class="cc-ant-report-grid"><div class="hs104-card"><div class="cc-toolbar"><strong>Series</strong><button class="cc-btn cc-btn-primary" data-add-serie>Agregar</button></div><div id="hs104Series"></div></div><div class="hs104-card"><div class="cc-toolbar"><strong>Años</strong><button class="cc-btn cc-btn-primary" data-add-anio>Agregar</button></div><div id="hs104Anios"></div></div></div><div class="hs104-card" style="margin-top:12px"><div class="cc-toolbar"><div><strong>Responsables</strong><div class="hs104-note">Captura correo para enviar automáticamente el enlace de aceptación.</div></div><button class="cc-btn cc-btn-primary" data-add-resp>Agregar responsable</button></div><div id="hs104RespCat"></div></div>';
    v.querySelector('#hs104Series').innerHTML=(D.series||[]).map(x=>catRow(x.codigo,x.estatus,'SERIE',x.id)).join('')||'<div class="cc-note">Sin series.</div>';
    v.querySelector('#hs104Anios').innerHTML=(D.anios||[]).map(x=>catRow(x.anio,x.estatus,'ANIO',x.id)).join('')||'<div class="cc-note">Sin años.</div>';
    v.querySelector('#hs104RespCat').innerHTML=(D.responsables||[]).map(x=>'<div style="padding:9px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:8px"><span><strong>'+esc(x.nombre)+'</strong><small style="display:block;color:#64748b">'+esc(x.numeroEmpleado||'')+(x.correo?' · '+esc(x.correo):' · SIN CORREO')+' · '+esc(x.estatus||'')+'</small></span><button class="cc-btn cc-btn-light" data-edit-resp="'+esc(x.id)+'">Editar</button></div>').join('')||'<div class="cc-note">Sin responsables.</div>';
    v.insertAdjacentHTML('beforeend','<div class="hs104-card" style="margin-top:12px"><div class="cc-toolbar"><div><strong>Liquidaciones</strong><div class="hs104-note">Comisiones por operador sobre hojas comprobadas pendientes.</div></div><button type="button" class="cc-btn cc-btn-primary" id="hs104OpenLiquidaciones"><i class="fa-solid fa-money-check-dollar mr-1"></i>Abrir liquidaciones</button></div><div class="hs104-note">Las hojas ya liquidadas no vuelven a aparecer; las que no tengan tarifa se marcan antes de generar.</div></div>');
    v.querySelector('[data-add-serie]').onclick=()=>editCatalog('SERIE');v.querySelector('[data-add-anio]').onclick=()=>editCatalog('ANIO');v.querySelector('[data-add-resp]').onclick=()=>editCatalog('RESPONSABLE');
    v.querySelector('#hs104OpenLiquidaciones').onclick=()=>{if(typeof window.ccOpenLiquidaciones==='function')window.ccOpenLiquidaciones();else alert('Liquidaciones todavía no terminó de cargar. Intenta nuevamente en un momento.');};
    v.querySelectorAll('[data-edit-cat]').forEach(b=>b.onclick=()=>editCatalog(b.dataset.type,(b.dataset.type==='SERIE'?D.series:D.anios).find(x=>String(x.id)===String(b.dataset.editCat))));v.querySelectorAll('[data-edit-resp]').forEach(b=>b.onclick=()=>editCatalog('RESPONSABLE',(D.responsables||[]).find(x=>String(x.id)===String(b.dataset.editResp))));
  }
  function catRow(label,status,type,id){return '<div style="padding:9px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:8px"><span><strong>'+esc(label)+'</strong><small style="display:block;color:#64748b">'+esc(status||'ACTIVO')+'</small></span><button class="cc-btn cc-btn-light" data-edit-cat="'+esc(id)+'" data-type="'+type+'">Editar</button></div>'}
  function editCatalog(type,x={}){if(!perm('catalogos'))return alert('Sin permiso para catálogos.');let body='';if(type==='SERIE')body='<div class="cc-field"><label>Serie *</label><input name="codigo" required value="'+esc(x.codigo||'')+'"></div><div class="cc-field"><label>Descripción</label><input name="descripcion" value="'+esc(x.descripcion||'')+'"></div>';else if(type==='ANIO')body='<div class="cc-field"><label>Año *</label><input name="anio" type="number" min="2000" max="2100" required value="'+esc(x.anio||new Date().getFullYear())+'"></div>';else body='<div class="hs104-grid"><div class="cc-field"><label>Nombre *</label><input name="nombre" required value="'+esc(x.nombre||'')+'"></div><div class="cc-field"><label>Número empleado</label><input name="numeroEmpleado" value="'+esc(x.numeroEmpleado||'')+'"></div><div class="cc-field"><label>Correo</label><input name="correo" type="email" value="'+esc(x.correo||'')+'"></div><div class="cc-field"><label>Teléfono</label><input name="telefono" value="'+esc(x.telefono||'')+'"></div></div>';body='<form>'+body+'<div class="cc-field"><label>Estatus</label><select name="estatus"><option '+(x.estatus!=='INACTIVO'?'selected':'')+'>ACTIVO</option><option '+(x.estatus==='INACTIVO'?'selected':'')+'>INACTIVO</option></select></div><div class="hs104-actions"><button type="button" class="cc-btn cc-btn-light" data-cancel>Cancelar</button><button type="submit" class="cc-btn cc-btn-primary">Guardar</button></div></form>';modal((x.id?'Editar ':'Agregar ')+type,body,{onSave:async fd=>{let item={id:x.id||'',estatus:fd.get('estatus')};if(type==='SERIE')item={...item,codigo:fd.get('codigo'),descripcion:fd.get('descripcion')};else if(type==='ANIO')item={...item,anio:Number(fd.get('anio'))};else item={...item,nombre:fd.get('nombre'),numeroEmpleado:fd.get('numeroEmpleado'),correo:fd.get('correo'),telefono:fd.get('telefono')};await rpc('hs_save_catalog',{p_tipo:type,p_item:item})}})}

  function boot(){if(!window.CC_AUTH_READY||!window.gmSupabase||!document.getElementById('controlCajasSection'))return setTimeout(boot,400);if(!install())return setTimeout(boot,400);load().catch(e=>console.warn('Hojas v104',e));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,700));else setTimeout(boot,700);
})();
