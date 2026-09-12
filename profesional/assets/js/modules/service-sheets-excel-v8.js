/* Tráfico App Profesional · Hojas de Servicio · Excel comprobación v8.1 */
(function(){
  if(window.__hsExcelV81)return; window.__hsExcelV81=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const norm=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const hdr=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  let lastRows=[], catalog={clientes:[]};

  function getVal(row,aliases){const map={};Object.keys(row||{}).forEach(k=>map[hdr(k)]=row[k]);for(const a of aliases){const k=hdr(a);if(Object.prototype.hasOwnProperty.call(map,k)&&String(map[k]??'').trim()!=='')return map[k]}return ''}
  function dateISO(v){
    if(!v)return '';
    if(v instanceof Date&&!isNaN(v))return v.toISOString().slice(0,10);
    if(typeof v==='number'&&window.XLSX?.SSF?.parse_date_code){const d=XLSX.SSF.parse_date_code(v);if(d?.y)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`}
    const s=String(v).trim();let m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})/);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    m=s.match(/^(20\d{2})[\/-](\d{1,2})[\/-](\d{1,2})/);if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
    const d=new Date(s);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):'';
  }
  function yearFrom(v){const d=dateISO(v);return d?Number(d.slice(0,4)):null}
  function parseRef(raw,row){
    const original=String(raw??'').trim(),up=original.toUpperCase().replace(/\s+/g,' ').trim();let serie='CFDI';
    const sm=up.match(/^([A-ZÑ]{1,15})(?:[\s\-_/]+|(?=\d))/);if(sm&&sm[1]&&!/^CFDI$/i.test(sm[1]))serie=sm[1];else if(/^CFDI(?:[\s\-_/]+|\d)/i.test(up))serie='CFDI';
    const nums=up.match(/\d+/g)||[];const folioNum=nums.length?Number(nums[nums.length-1]):null;let anio=null;for(const n of nums){const y=Number(n);if(y>=2000&&y<=2100){anio=y;break}}
    if(!anio)anio=yearFrom(getVal(row,['FechaSalida','Fecha Salida','Salida','FECHA SALIDA','F. Salida','HoraSalida','Hora Salida','Fecha','FECHA']));
    return {original,serie:serie||'CFDI',folioNum:Number.isFinite(folioNum)?folioNum:null,anio};
  }
  async function systemData(){
    const [ctl,list]=await Promise.all([sb().rpc('hs_control_folios',{p_filters:{}}),sb().rpc('hs_list')]);
    if(ctl.error)throw ctl.error;if(list.error)throw list.error;if(!ctl.data?.ok)throw new Error(ctl.data?.error||'No se pudo cargar el control de hojas');
    catalog=list.data||{clientes:[]};return ctl.data.folios||[];
  }
  function matchOne(ref,all){if(ref.folioNum==null)return {status:'INVALIDA',match:null};let xs=all.filter(x=>String(x.serie||'').toUpperCase()===ref.serie&&Number(x.consecutivo)===ref.folioNum);if(ref.anio)xs=xs.filter(x=>Number(x.anio)===Number(ref.anio));if(xs.length===1)return {status:'ENCONTRADA',match:xs[0]};if(xs.length>1)return {status:'AMBIGUA',match:null};return {status:'NO_REGISTRADA',match:null}}
  function clientMatch(name){const n=norm(name);if(!n)return null;return (catalog.clientes||[]).find(c=>norm(c.nombre)===n||norm(c.razonSocial)===n)||null}
  function extractRows(wb){
    const out=[];wb.SheetNames.forEach(sn=>{const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{defval:'',raw:true});rows.forEach((r,i)=>{
      const raw=getVal(r,['Noviajecliente','NoViajeCliente','No Viaje Cliente','No. Viaje Cliente','HojaServicio','Hoja Servicio']);if(String(raw??'').trim()==='')return;
      const fechaRaw=getVal(r,['FechaSalida','Fecha Salida','Salida','FECHA SALIDA','F. Salida','HoraSalida','Hora Salida','Fecha','FECHA']);
      out.push({sheet:sn,row:i+2,raw:String(raw).trim(),ref:parseRef(raw,r),operador:String(getVal(r,['Operador','Nombre Operador','Chofer','CONDUCTOR','OPERADOR','NombreOperador'])||'').trim(),cliente:String(getVal(r,['Cliente','Nombre Cliente','Razon Social','NombreCliente','CLIENTE','CLIENTE/PROVEEDOR'])||'').trim(),tipoViaje:String(getVal(r,['TipoViaje','Tipo Viaje','Tipo_Viaje','TIPO DE VIAJE','TipoServicio','Tipo Servicio','Tipo'])||'').trim(),clasificacion:String(getVal(r,['Clasificacion','Clasificación','CLASIFICACION','Clasif','Clase'])||'').trim(),fechaUso:dateISO(fechaRaw)});
    })});const seen=new Set();return out.filter(x=>{const k=norm(x.raw)+'|'+norm(x.operador);if(seen.has(k))return false;seen.add(k);return true})
  }
  function ensureCard(){
    const v=document.getElementById('hsViewComprobacion');if(!v)return null;let c=document.getElementById('hsExcelCompareV8');if(c)return c;
    c=document.createElement('div');c.id='hsExcelCompareV8';c.className='cc-config-card';c.style.marginBottom='14px';c.innerHTML='<div class="cc-toolbar"><div><strong>Comprobar hojas desde Excel de operación</strong><div class="cc-note">Lee <b>NoViajeCliente</b>, fecha de uso, cliente, tipo de viaje y clasificación. Si no detecta serie, usa <b>CFDI</b>.</div></div><label class="cc-btn cc-btn-primary" style="cursor:pointer"><i class="fa-solid fa-file-excel mr-1"></i>Cargar Excel<input id="hsExcelInputV8" type="file" accept=".xlsx,.xls,.csv" style="display:none"></label></div><div id="hsExcelSummaryV8" class="cc-note">Sin archivo cargado.</div><div id="hsExcelResultsV8" style="display:none;margin-top:10px"><div class="cc-inv-wrap" style="max-height:480px;overflow:auto"><table class="cc-ant-table"><thead><tr><th>NO VIAJE CLIENTE</th><th>HOJA / SERIE</th><th>OPERADOR</th><th>FECHA USO</th><th>CLIENTE</th><th>TIPO VIAJE</th><th>CLASIFICACIÓN</th><th>ESTADO / ACCIÓN</th></tr></thead><tbody id="hsExcelBodyV8"></tbody></table></div></div>';
    const toolbar=v.querySelector(':scope > .cc-toolbar');toolbar?.insertAdjacentElement('afterend',c);c.querySelector('#hsExcelInputV8').onchange=e=>handleFile(e.target.files?.[0]);return c;
  }
  async function useExcel(idx){
    const x=lastRows[idx],m=x?.result?.match;if(!x||!m||m.estatus!=='ASIGNADO_OPERADOR')return alert('La hoja ya no está pendiente de comprobar.');const cli=clientMatch(x.cliente);if(!cli)return alert('El cliente del Excel no coincide con un cliente activo.');if(!x.fechaUso||!x.tipoViaje||!x.clasificacion)return alert('Falta fecha de uso, tipo de viaje o clasificación en el Excel.');
    if(!confirm(`Comprobar ${m.folio} con los datos del Excel?`))return;
    const r=await sb().rpc('hs_mark_used',{p_item:{folioId:m.id,fechaUso:x.fechaUso,clienteId:cli.id,tipoViaje:x.tipoViaje,clasificacion:x.clasificacion,servicio:x.tipoViaje,observaciones:'Comprobación desde Excel · '+x.sheet+' fila '+x.row}});if(r.error)return alert(r.error.message||r.error);if(!r.data?.ok)return alert(r.data?.error||'No se pudo comprobar');alert('Hoja '+r.data.folio+' comprobada. Fecha de comprobación registrada automáticamente.');
    const all=await systemData();lastRows=lastRows.map(y=>({...y,result:matchOne(y.ref,all)}));render(lastRows);document.dispatchEvent(new CustomEvent('hs:comprobacion-actualizada'));
  }
  function render(rows){
    const c=ensureCard();if(!c)return;const sum=c.querySelector('#hsExcelSummaryV8'),box=c.querySelector('#hsExcelResultsV8'),body=c.querySelector('#hsExcelBodyV8');const found=rows.filter(x=>x.result.status==='ENCONTRADA').length,cfdi=rows.filter(x=>x.ref.serie==='CFDI').length,missing=rows.filter(x=>x.result.status==='NO_REGISTRADA').length;
    sum.innerHTML='<strong>'+rows.length+'</strong> hoja(s) detectadas · <strong>'+found+'</strong> encontradas · <strong>'+missing+'</strong> no registradas · <strong>'+cfdi+'</strong> CFDI';box.style.display='block';
    body.innerHTML=rows.length?rows.map((x,i)=>{const m=x.result.match,cli=clientMatch(x.cliente);let label=x.result.status,action='';if(m){label=m.estatus==='ASIGNADO_OPERADOR'?'PENDIENTE':m.estatus==='UTILIZADO'?'YA COMPROBADA':m.estatus;if(m.estatus==='ASIGNADO_OPERADOR'){const ready=cli&&x.fechaUso&&x.tipoViaje&&x.clasificacion;action=ready?'<button class="cc-btn cc-btn-primary" data-xls-use="'+i+'">Comprobar</button>':'<div style="font-size:9px;color:#b45309;margin-top:4px">Faltan datos o cliente no reconocido</div>'}}
      return '<tr><td><strong>'+esc(x.raw)+'</strong><div style="font-size:9px;color:#64748b">'+esc(x.sheet)+' · fila '+x.row+'</div></td><td><strong>'+esc(m?.folio||x.ref.folioNum||'—')+'</strong><div style="font-size:9px;color:#64748b">Serie '+esc(x.ref.serie)+(x.ref.anio?' · '+x.ref.anio:'')+'</div></td><td>'+esc(x.operador||m?.operador||'—')+'</td><td>'+esc(x.fechaUso||'—')+'</td><td>'+esc(x.cliente||'—')+(cli?'':'<div style="font-size:9px;color:#b91c1c">No coincide con catálogo</div>')+'</td><td>'+esc(x.tipoViaje||'—')+'</td><td>'+esc(x.clasificacion||'—')+'</td><td><span class="cc-badge">'+esc(label)+'</span>'+action+'</td></tr>'}).join(''):'<tr><td colspan="8" style="text-align:center;padding:20px">No se encontraron valores en NoViajeCliente.</td></tr>';
    body.querySelectorAll('[data-xls-use]').forEach(b=>b.onclick=()=>useExcel(Number(b.dataset.xlsUse)));
  }
  async function handleFile(file){if(!file)return;const c=ensureCard(),sum=c?.querySelector('#hsExcelSummaryV8');if(sum)sum.textContent='Leyendo archivo y comparando hojas…';try{if(!window.XLSX)throw new Error('No está disponible el lector de Excel.');const buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:'array',cellDates:true}),rows=extractRows(wb),all=await systemData();lastRows=rows.map(x=>({...x,result:matchOne(x.ref,all)}));render(lastRows)}catch(e){if(sum)sum.innerHTML='<span style="color:#b91c1c;font-weight:800">'+esc(e.message||e)+'</span>'}}
  function install(){let tries=0;const t=setInterval(()=>{tries++;ensureCard();if(tries>40)clearInterval(t)},300);document.addEventListener('click',e=>{if(e.target.closest?.('#ccPanelHojasServicio [data-hsv="Comprobacion"]'))setTimeout(ensureCard,120)},true)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,1400));else setTimeout(install,1400);
})();
