/* Tráfico App Profesional · Anticipos v28 · Operadores / Beneficiarios */
(function(){
  if(window.__ccAntV28)return; window.__ccAntV28=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const money=v=>Number(v||0).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const date=v=>v?new Date(v).toLocaleDateString('es-MX'):'—';
  const can=p=>window.CC_ACCESS?.rol==='ADMIN'||(typeof window.ccPerm==='function'&&window.ccPerm('anticipos.'+p));
  let DATA={anticipos:[],detalles:[],comprobaciones:[],destinoConceptos:[],conceptos:[],destinos:[],tiposUnidadAnticipos:[]};
  let modo='OPERADOR';

  async function loadV28(){
    if(!sb())throw new Error('Supabase no está disponible.');
    const r=await sb().rpc('cc_ant_list_v28');
    if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudieron cargar anticipos');
    DATA=r.data;return DATA;
  }
  const isBen=a=>!!(a?.esBeneficiario||a?.esCajaChica||a?.responsableId||a?.beneficiarioId);
  const person=a=>isBen(a)?(a.beneficiario||a.persona||'Beneficiario'):(a.operador||a.persona||'Operador');
  const details=id=>(DATA.detalles||[]).filter(x=>x.anticipoId===id&&String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');
  const comps=id=>(DATA.comprobaciones||[]).filter(x=>x.anticipo_id===id&&String(x.estatus||'ACTIVO').toUpperCase()==='ACTIVO');

  function installStyle(){
    if(document.getElementById('ccAntV28Style'))return;
    const s=document.createElement('style');s.id='ccAntV28Style';s.textContent=`
      #ccAntV28Switch{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 12px}
      #ccAntV28Switch .cc-btn.active{background:#1d4ed8!important;color:#fff!important;border-color:#1d4ed8!important}
      #ccAntV28ModeNote{font-size:10px;color:#64748b;margin:3px 0 10px}
      #ccAntBody tr[data-v28-kind="BENEFICIARIO"]{box-shadow:inset 4px 0 0 #7c3aed}
      #ccAntBody tr[data-v28-kind="OPERADOR"]{box-shadow:inset 4px 0 0 #2563eb}
      #ccDestCfg12 #ccAntV28ConceptSearch{margin-bottom:9px}
      #ccDestCfg12 [data-v28-hidden="1"]{display:none!important}
    `;document.head.appendChild(s);
  }

  function ensureSwitch(){
    const body=document.getElementById('ccAntBody');if(!body)return;
    const wrap=body.closest('.cc-inv-wrap')||body.parentElement;if(!wrap)return;
    let sw=document.getElementById('ccAntV28Switch');
    if(!sw){
      sw=document.createElement('div');sw.id='ccAntV28Switch';
      sw.innerHTML='<button type="button" class="cc-btn cc-btn-light" data-v28-mode="OPERADOR"><i class="fa-solid fa-truck-fast mr-1"></i>Anticipos de operadores</button><button type="button" class="cc-btn cc-btn-light" data-v28-mode="BENEFICIARIO"><i class="fa-solid fa-user-check mr-1"></i>Anticipos de beneficiarios</button>';
      const note=document.createElement('div');note.id='ccAntV28ModeNote';wrap.before(sw,note);
      sw.onclick=e=>{const b=e.target.closest('[data-v28-mode]');if(!b)return;modo=b.dataset.v28Mode;applyList()};
    }
    sw.querySelectorAll('[data-v28-mode]').forEach(b=>b.classList.toggle('active',b.dataset.v28Mode===modo));
    const note=document.getElementById('ccAntV28ModeNote');if(note)note.textContent=modo==='OPERADOR'?'Mostrando únicamente anticipos de operadores. Destino, Tipo de unidad y conceptos configurados aplican a este flujo.':'Mostrando únicamente anticipos de beneficiarios. Tienen las mismas opciones de PDF, enlaces, comprobación, extras, devolución, cancelación y reapertura.';
  }

  function actionHtml(a){
    const p=Number(a.pendiente||0),closed=String(a.estatus||'').toUpperCase()==='CERRADO',cancel=String(a.estatus||'').toUpperCase()==='CANCELADO';
    let h='<button class="cc-btn cc-btn-light" data-v28="detail" data-id="'+esc(a.id)+'">Detalle</button> <button class="cc-btn cc-btn-light" data-v28="pdf" data-id="'+esc(a.id)+'">PDF</button> ';
    if(closed){h+='<button class="cc-btn cc-btn-primary" data-v28="reopen" data-id="'+esc(a.id)+'"><i class="fa-solid fa-lock-open mr-1"></i>Abrir anticipo</button>';return h}
    if(!cancel){
      if(can('editar'))h+='<button class="cc-btn cc-btn-light" data-v28="links" data-id="'+esc(a.id)+'">Enlaces</button> ';
      if(can('comprobar'))h+='<button class="cc-btn cc-btn-light" data-v28="comp" data-id="'+esc(a.id)+'">Comprobar</button> ';
      if(can('editar'))h+='<button class="cc-btn cc-btn-primary" data-v28="extra" data-id="'+esc(a.id)+'">Añadir extra</button> ';
      if(can('caja')&&p>0)h+='<button class="cc-btn cc-btn-light" data-v28="dev" data-id="'+esc(a.id)+'">Devolución</button> ';
      if(can('cancelar'))h+='<button class="cc-btn cc-btn-danger" data-v28="can" data-id="'+esc(a.id)+'">Cancelar</button>';
    }
    return h;
  }

  function applyList(){
    ensureSwitch();
    const body=document.getElementById('ccAntBody');if(!body)return;
    const de=document.getElementById('ccAntDesde')?.value||'',ha=document.getElementById('ccAntHasta')?.value||'',es=document.getElementById('ccAntEstatusFiltro')?.value||'';
    let rows=(DATA.anticipos||[]).filter(a=>modo==='BENEFICIARIO'?isBen(a):!isBen(a));
    rows=rows.filter(a=>{const d=String(a.fecha||'').slice(0,10);return(!de||d>=de)&&(!ha||d<=ha)&&(!es||a.estatus===es)});
    const personFilter=document.getElementById('ccAntOperadorFiltro');
    if(personFilter){
      const cur=personFilter.dataset.v28mode===modo?personFilter.value:'';const people=new Map();rows.forEach(a=>{const id=isBen(a)?a.beneficiarioId:a.operadorId;if(id)people.set(id,person(a))});
      personFilter.dataset.v28mode=modo;personFilter.innerHTML='<option value="">Todos</option>'+[...people.entries()].sort((a,b)=>a[1].localeCompare(b[1],'es')).map(([id,n])=>'<option value="'+esc(id)+'">'+esc(n)+'</option>').join('');personFilter.value=cur;
      if(personFilter.value)rows=rows.filter(a=>String(isBen(a)?a.beneficiarioId:a.operadorId)===String(personFilter.value));
      const lab=personFilter.closest('div')?.querySelector('label');if(lab)lab.textContent=modo==='BENEFICIARIO'?'Beneficiario':'Operador';
    }
    window.ccAntFiltered=rows;
    const th=body.closest('table')?.querySelectorAll('thead th');if(th?.length){th[2].textContent=modo==='BENEFICIARIO'?'BENEFICIARIO':'OPERADOR';th[4].textContent='TIPO DE UNIDAD'}
    body.innerHTML=rows.length?rows.map(a=>{
      const ds=details(a.id),res=ds.map(z=>esc(z.concepto)+' '+money(z.monto)+(z.origen==='EXTRA'?' +EXTRA':'')).join(' · '),p=Number(a.pendiente||0);
      return '<tr data-v28-kind="'+(isBen(a)?'BENEFICIARIO':'OPERADOR')+'"><td><strong>'+esc(a.folio)+'</strong><div style="font-size:9px;color:#64748b">'+esc(a.tipoPersona||'')+'</div></td><td>'+date(a.fecha)+'</td><td><strong>'+esc(person(a))+'</strong></td><td><strong>'+esc(a.destino||'—')+'</strong><div style="font-size:9px;color:#64748b;max-width:290px">'+(res||'Sin conceptos')+'</div></td><td>'+esc(a.tipoUnidadAnticipo||'—')+'</td><td>'+esc(a.metodoDeposito||'—')+'</td><td>'+esc(a.viaje||'—')+'</td><td>'+money(a.montoAutorizado??a.monto)+'</td><td>'+money(a.comprobado)+'</td><td><strong>'+money(p)+'</strong></td><td>'+esc(a.estatus)+'</td><td><div style="display:flex;gap:5px;flex-wrap:wrap">'+actionHtml(a)+'</div></td></tr>';
    }).join(''):'<tr><td colspan="12" style="padding:26px;text-align:center;color:#94a3b8">Sin anticipos de '+(modo==='BENEFICIARIO'?'beneficiarios':'operadores')+'.</td></tr>';
    body.onclick=e=>{const b=e.target.closest('[data-v28]');if(!b)return;const id=b.dataset.id,act=b.dataset.v28;if(act==='detail')openDetail(id);if(act==='pdf')window.ccAntPDFById?.(id);if(act==='links')window.ccAntLinks?.(id);if(act==='comp')window.ccAntComprobar?.(id);if(act==='extra')window.ccAntExtra?.(id);if(act==='dev')window.ccAntDevolucion?.(id);if(act==='can')window.ccAntCancelar?.(id);if(act==='reopen')window.ccAntReabrir?.(id)};
    document.querySelectorAll('#ccAntV28Switch [data-v28-mode]').forEach(b=>b.classList.toggle('active',b.dataset.v28Mode===modo));
  }

  function openDetail(id){
    const a=(DATA.anticipos||[]).find(x=>x.id===id);if(!a)return;
    document.getElementById('ccAntV28Detail')?.remove();
    const ds=details(id),cs=comps(id),ov=document.createElement('div');ov.id='ccAntV28Detail';ov.style='position:fixed;inset:0;background:rgba(15,23,42,.78);z-index:2147483400;display:flex;align-items:center;justify-content:center;padding:12px';
    const row=(k,v)=>'<div style="padding:7px 9px;border-bottom:1px solid #e2e8f0"><span style="font-size:9px;color:#64748b;font-weight:800">'+k+'</span><div style="font-size:12px;font-weight:800">'+esc(v??'—')+'</div></div>';
    ov.innerHTML='<div style="background:#fff;width:min(1050px,98vw);max-height:96vh;overflow:auto;border-radius:18px"><div style="position:sticky;top:0;z-index:2;background:#0f172a;color:#fff;padding:15px 18px;display:flex;justify-content:space-between"><div><strong>Detalle completo · '+esc(a.folio)+'</strong><div style="font-size:10px;color:#cbd5e1">'+(isBen(a)?'Beneficiario':'Operador')+' · '+esc(person(a))+'</div></div><button data-x style="background:none;border:0;color:#fff;font-size:25px">×</button></div><div style="padding:18px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">'+row('Folio',a.folio)+row('Fecha',date(a.fecha))+row(isBen(a)?'Beneficiario':'Operador',person(a))+row('Cuenta',a.cuenta)+row('Método depósito',a.metodoDeposito)+row('Destino',a.destino)+row('Tipo de unidad',a.tipoUnidadAnticipo)+row('Unidad',a.unidad)+row('Viaje',a.viaje)+row('Referencia',a.referencia)+row('Estatus',a.estatus)+row('Firma',a.firmaEstatus||'—')+'</div><div style="margin-top:12px" class="cc-config-alert"><strong>Autorizado:</strong> '+money(a.montoAutorizado??a.monto)+' · <strong>Entregado:</strong> '+money(a.montoEntregado)+' · <strong>Comprobado:</strong> '+money(a.comprobado)+' · <strong>Devuelto:</strong> '+money(a.devuelto)+' · <strong>Pendiente:</strong> '+money(a.pendiente)+'</div><div class="cc-toolbar" style="margin-top:14px"><strong>Conceptos</strong></div><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>CONCEPTO</th><th>MONTO</th><th>ORIGEN</th></tr></thead><tbody>'+(ds.map(x=>'<tr><td>'+esc(x.concepto)+'</td><td>'+money(x.monto)+'</td><td>'+esc(x.origen||'BASE')+'</td></tr>').join('')||'<tr><td colspan="3">Sin conceptos</td></tr>')+'</tbody></table></div><div class="cc-toolbar" style="margin-top:14px"><strong>Comprobaciones</strong></div><div class="cc-inv-wrap"><table class="cc-ant-table"><thead><tr><th>FECHA</th><th>CONCEPTO</th><th>TIPO</th><th>FOLIO</th><th>MONTO</th></tr></thead><tbody>'+(cs.map(x=>'<tr><td>'+date(x.fecha)+'</td><td>'+esc(x.concepto||'—')+'</td><td>'+esc(x.tipo_documento||'—')+'</td><td>'+esc(x.folio_documento||'—')+'</td><td>'+money(x.monto)+'</td></tr>').join('')||'<tr><td colspan="5">Sin comprobaciones</td></tr>')+'</tbody></table></div><div style="margin-top:14px"><strong>Observaciones</strong><div style="margin-top:5px;padding:9px;background:#f8fafc;border-radius:8px">'+esc(a.observaciones||'Sin observaciones')+'</div></div><div style="display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;margin-top:16px"><button class="cc-btn cc-btn-light" data-act="pdf">PDF</button>'+(can('editar')&&a.estatus!=='CERRADO'&&a.estatus!=='CANCELADO'?'<button class="cc-btn cc-btn-light" data-act="links">Enlaces</button>':'')+(can('comprobar')&&a.estatus!=='CERRADO'&&a.estatus!=='CANCELADO'?'<button class="cc-btn cc-btn-primary" data-act="comp">Comprobar</button>':'')+'<button class="cc-btn cc-btn-light" data-act="close">Cerrar</button></div></div></div>';
    document.body.appendChild(ov);const close=()=>ov.remove();ov.querySelector('[data-x]').onclick=close;ov.onclick=e=>{const b=e.target.closest('[data-act]');if(!b)return;if(b.dataset.act==='close')close();if(b.dataset.act==='pdf')window.ccAntPDFById?.(id);if(b.dataset.act==='links')window.ccAntLinks?.(id);if(b.dataset.act==='comp'){close();window.ccAntComprobar?.(id)}};
  }

  async function pdfBenef(a){
    if(!window.jspdf?.jsPDF)return;
    const ds=details(a.id),cs=comps(a.id),d=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'letter'});
    d.setFont('helvetica','bold');d.setFontSize(16);d.text('ANTICIPO A BENEFICIARIO',14,16);d.setFontSize(8);d.setFont('helvetica','normal');
    const lines=[['Folio',a.folio],['Fecha',date(a.fecha)],['Beneficiario',person(a)],['Cuenta',a.cuenta||'—'],['Método de depósito',a.metodoDeposito||'—'],['Referencia',a.referencia||'—'],['Estatus',a.estatus||'—']];
    let y=24;lines.forEach(([k,v])=>{d.setFont('helvetica','bold');d.text(k+':',14,y);d.setFont('helvetica','normal');d.text(String(v),48,y,{maxWidth:150});y+=6});
    d.autoTable({startY:y+2,head:[['Concepto','Monto','Origen']],body:ds.map(x=>[String(x.concepto||''),money(x.monto),String(x.origen||'BASE')]),styles:{fontSize:8},headStyles:{fillColor:[76,29,149]}});y=(d.lastAutoTable?.finalY||y+15)+7;
    d.setFont('helvetica','bold');d.text('Autorizado: '+money(a.montoAutorizado??a.monto),14,y);d.text('Entregado: '+money(a.montoEntregado),105,y);y+=6;d.text('Comprobado: '+money(a.comprobado),14,y);d.text('Devuelto: '+money(a.devuelto),105,y);y+=6;d.text('Pendiente: '+money(a.pendiente),14,y);y+=8;
    if(cs.length){d.setFont('helvetica','bold');d.text('Comprobaciones',14,y);d.autoTable({startY:y+3,head:[['Fecha','Concepto','Tipo','Folio','Monto']],body:cs.map(x=>[date(x.fecha),String(x.concepto||''),String(x.tipo_documento||''),String(x.folio_documento||''),money(x.monto)]),styles:{fontSize:7},headStyles:{fillColor:[30,64,175]}});y=(d.lastAutoTable?.finalY||y+15)+7}
    d.setFontSize(7);d.setFont('helvetica','normal');d.text('Observaciones: '+String(a.observaciones||'Sin observaciones'),14,Math.min(y,245),{maxWidth:180});d.save('Anticipo_'+(a.folio||'beneficiario')+'.pdf');
  }

  function installPdf(){
    if(typeof window.ccAntPDFById!=='function'||window.ccAntPDFById.__v28)return;
    const old=window.ccAntPDFById;const w=function(id){const a=(DATA.anticipos||[]).find(x=>x.id===id);if(a&&isBen(a))return pdfBenef(a);return old.apply(this,arguments)};w.__v28=true;window.ccAntPDFById=w;
  }

  function renameCatalogs(){
    document.querySelectorAll('#ccPanelAnticipos label,#ccPanelAnticipos strong,#ccPanelAnticipos .cc-note').forEach(el=>{
      if(el.children.length)return;const t=el.textContent||'';
      if(/Tipo de viaje\s*\/\s*anticipo/i.test(t))el.textContent=t.replace(/Tipo de viaje\s*\/\s*anticipo/ig,'Tipo de unidad');
      if(/^Tipos de viaje\s*\/\s*anticipo$/i.test(t.trim()))el.textContent='Tipos de unidad';
    });
    const modal=document.getElementById('ccDestCfg12');if(modal){
      const label=[...modal.querySelectorAll('label')].find(x=>/Tipo de viaje|Tipo/i.test(x.textContent||''));if(label)label.textContent='Tipo de unidad *';
      const box=modal.querySelector('#ccDestConceptRows12');if(box&&!document.getElementById('ccAntV28ConceptSearch')){
        const inp=document.createElement('input');inp.id='ccAntV28ConceptSearch';inp.className='cc-input';inp.type='search';inp.placeholder='Buscar concepto registrado...';box.before(inp);inp.oninput=()=>{const q=(inp.value||'').toLowerCase().trim();[...box.children].forEach(r=>{r.dataset.v28Hidden=q&&!String(r.textContent||'').toLowerCase().includes(q)?'1':'0'})};
        const note=document.createElement('div');note.className='cc-note';note.style.marginBottom='7px';note.textContent='Marca los conceptos que aplican a este Destino + Tipo de unidad. Activa “Default” para que se carguen automáticamente al crear el anticipo del operador.';inp.after(note);
      }
    }
  }

  function wrapCore(){
    if(typeof window.ccAntRender==='function'&&!window.ccAntRender.__v28){const old=window.ccAntRender;const w=function(){const r=old.apply(this,arguments);setTimeout(()=>{applyList();renameCatalogs()},0);return r};w.__v28=true;window.ccAntRender=w}
    const oldLoad=window.ccAntLoad;if(typeof oldLoad==='function'&&!oldLoad.__v28){const w=async function(){const r=await oldLoad.apply(this,arguments);try{await loadV28()}catch(e){console.warn('Anticipos v28',e)}setTimeout(()=>{applyList();renameCatalogs()},0);return r};w.__v28=true;window.ccAntLoad=w}
  }

  async function boot(){
    installStyle();
    if(!window.gmSupabase||!window.CC_AUTH_READY)return setTimeout(boot,350);
    try{await loadV28()}catch(e){console.warn('Anticipos v28',e)}
    wrapCore();installPdf();applyList();renameCatalogs();
    document.addEventListener('change',e=>{if(e.target?.id==='ccAntOperadorFiltro'||e.target?.id==='ccAntEstatusFiltro'||e.target?.id==='ccAntDesde'||e.target?.id==='ccAntHasta')setTimeout(applyList,0)},true);
    document.addEventListener('click',e=>{if(e.target.closest?.('#ccPanelAnticipos [data-antv="catalogos"]'))setTimeout(renameCatalogs,180);if(e.target.closest?.('#ccAntNuevoBtn'))setTimeout(renameCatalogs,120)},true);
    new MutationObserver(()=>{renameCatalogs();if(document.getElementById('ccAntBody'))ensureSwitch()}).observe(document.getElementById('ccPanelAnticipos')||document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1900));else setTimeout(boot,1900);
})();
