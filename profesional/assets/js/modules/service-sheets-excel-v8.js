/* Tráfico App Profesional · Hojas de Servicio · Excel comprobación v8 */
(function(){
  if(window.__hsExcelV8)return; window.__hsExcelV8=true;
  const sb=()=>window.gmSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const norm=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const hdr=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  let lastRows=[];

  function getVal(row,aliases){
    const map={};Object.keys(row||{}).forEach(k=>map[hdr(k)]=row[k]);
    for(const a of aliases){const k=hdr(a);if(Object.prototype.hasOwnProperty.call(map,k)&&String(map[k]??'').trim()!=='')return map[k]}
    return '';
  }
  function yearFrom(v){
    if(v==null||v==='')return null;
    if(typeof v==='number'&&window.XLSX?.SSF?.parse_date_code){const d=XLSX.SSF.parse_date_code(v);return d?.y||null}
    const s=String(v);const m=s.match(/\b(20\d{2})\b/);if(m)return Number(m[1]);const d=new Date(s);return Number.isFinite(d.getTime())?d.getFullYear():null;
  }
  function parseRef(raw,row){
    const original=String(raw??'').trim();
    const up=original.toUpperCase().replace(/\s+/g,' ').trim();
    let serie='CFDI';
    const sm=up.match(/^([A-ZÑ]{1,15})(?:[\s\-_/]+|(?=\d))/);
    if(sm&&sm[1]&&!/^CFDI$/i.test(sm[1]))serie=sm[1];
    else if(/^CFDI(?:[\s\-_/]+|\d)/i.test(up))serie='CFDI';
    const nums=up.match(/\d+/g)||[];
    const folioNum=nums.length?Number(nums[nums.length-1]):null;
    let anio=null;for(const n of nums){const y=Number(n);if(y>=2000&&y<=2100){anio=y;break}}
    if(!anio)anio=yearFrom(getVal(row,['FechaSalida','Fecha Salida','Salida','FECHA SALIDA','F. Salida','HoraSalida','Hora Salida','Fecha','FECHA']));
    return {original,serie:serie||'CFDI',folioNum:Number.isFinite(folioNum)?folioNum:null,anio};
  }
  async function systemFolios(){
    const r=await sb().rpc('hs_control_folios',{p_filters:{}});if(r.error)throw r.error;if(!r.data?.ok)throw new Error(r.data?.error||'No se pudo cargar el control de hojas');return r.data.folios||[];
  }
  function matchOne(ref,all){
    if(ref.folioNum==null)return {status:'INVALIDA',match:null};
    let xs=all.filter(x=>String(x.serie||'').toUpperCase()===ref.serie&&Number(x.consecutivo)===ref.folioNum);
    if(ref.anio)xs=xs.filter(x=>Number(x.anio)===Number(ref.anio));
    if(xs.length===1)return {status:'ENCONTRADA',match:xs[0]};
    if(xs.length>1)return {status:'AMBIGUA',match:null};
    return {status:'NO_REGISTRADA',match:null};
  }
  function extractRows(wb){
    const out=[];
    wb.SheetNames.forEach(sn=>{
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{defval:'',raw:true});
      rows.forEach((r,i)=>{
        const raw=getVal(r,['Noviajecliente','NoViajeCliente','No Viaje Cliente','No. Viaje Cliente','HojaServicio','Hoja Servicio']);
        if(String(raw??'').trim()==='')return;
        const ref=parseRef(raw,r);
        out.push({sheet:sn,row:i+2,raw:String(raw).trim(),ref,
          operador:String(getVal(r,['Operador','Nombre Operador','Chofer','CONDUCTOR','OPERADOR','NombreOperador'])||'').trim(),
          cliente:String(getVal(r,['Cliente','Nombre Cliente','Razon Social','NombreCliente','CLIENTE','CLIENTE/PROVEEDOR'])||'').trim(),
          tipo:String(getVal(r,['TipoViaje','Tipo Viaje','Tipo_Viaje','TIPO DE VIAJE','TipoServicio','Tipo Servicio','Tipo'])||'').trim(),
          fecha:getVal(r,['FechaSalida','Fecha Salida','Salida','FECHA SALIDA','F. Salida','HoraSalida','Hora Salida','Fecha','FECHA'])
        });
      });
    });
    const seen=new Set();return out.filter(x=>{const k=norm(x.raw)+'|'+norm(x.operador);if(seen.has(k))return false;seen.add(k);return true});
  }
  function ensureCard(){
    const v=document.getElementById('hsViewComprobacion');if(!v)return null;
    let c=document.getElementById('hsExcelCompareV8');if(c)return c;
    c=document.createElement('div');c.id='hsExcelCompareV8';c.className='cc-config-card';c.style.marginBottom='14px';
    c.innerHTML='<div class="cc-toolbar"><div><strong>Comparar hojas contra Excel de operación</strong><div class="cc-note">Lee el campo <b>NoViajeCliente</b>. Si no detecta serie, la hoja se considera de serie <b>CFDI</b>.</div></div><label class="cc-btn cc-btn-primary" style="cursor:pointer"><i class="fa-solid fa-file-excel mr-1"></i>Cargar Excel<input id="hsExcelInputV8" type="file" accept=".xlsx,.xls,.csv" style="display:none"></label></div><div id="hsExcelSummaryV8" class="cc-note">Sin archivo cargado.</div><div id="hsExcelResultsV8" style="display:none;margin-top:10px"><div class="cc-inv-wrap" style="max-height:420px;overflow:auto"><table class="cc-ant-table"><thead><tr><th>NO VIAJE CLIENTE</th><th>SERIE</th><th>FOLIO</th><th>OPERADOR EXCEL</th><th>HOJA SISTEMA</th><th>OPERADOR ASIGNADO</th><th>ESTADO</th></tr></thead><tbody id="hsExcelBodyV8"></tbody></table></div></div>';
    const toolbar=v.querySelector(':scope > .cc-toolbar');toolbar?.insertAdjacentElement('afterend',c);
    c.querySelector('#hsExcelInputV8').onchange=e=>handleFile(e.target.files?.[0]);
    return c;
  }
  function render(rows){
    const c=ensureCard();if(!c)return;const sum=c.querySelector('#hsExcelSummaryV8'),box=c.querySelector('#hsExcelResultsV8'),body=c.querySelector('#hsExcelBodyV8');
    const found=rows.filter(x=>x.result.status==='ENCONTRADA').length,cfdi=rows.filter(x=>x.ref.serie==='CFDI').length,missing=rows.filter(x=>x.result.status==='NO_REGISTRADA').length,amb=rows.filter(x=>x.result.status==='AMBIGUA').length;
    sum.innerHTML='<strong>'+rows.length+'</strong> hoja(s) detectadas · <strong>'+found+'</strong> encontradas · <strong>'+missing+'</strong> no registradas · <strong>'+amb+'</strong> ambiguas · <strong>'+cfdi+'</strong> clasificadas como CFDI';
    box.style.display='block';
    body.innerHTML=rows.length?rows.map(x=>{const m=x.result.match;let label=x.result.status,style='background:#fee2e2;color:#991b1b';if(label==='ENCONTRADA'){label=m?.estatus==='ASIGNADO_OPERADOR'?'PENDIENTE DE COMPROBAR':m?.estatus==='UTILIZADO'?'YA COMPROBADA':'ENCONTRADA · '+(m?.estatus||'');style=m?.estatus==='ASIGNADO_OPERADOR'?'background:#fef3c7;color:#92400e':'background:#dcfce7;color:#166534'}else if(label==='AMBIGUA'){style='background:#e0e7ff;color:#3730a3'}return '<tr><td><strong>'+esc(x.raw)+'</strong><div style="font-size:9px;color:#64748b">'+esc(x.sheet)+' · fila '+x.row+'</div></td><td><span class="cc-badge">'+esc(x.ref.serie)+'</span></td><td>'+esc(x.ref.folioNum??'—')+(x.ref.anio?'<div style="font-size:9px;color:#64748b">Año '+x.ref.anio+'</div>':'')+'</td><td>'+esc(x.operador||'—')+'</td><td>'+esc(m?.folio||'—')+'</td><td>'+esc(m?.operador||'—')+'</td><td><span style="display:inline-block;padding:4px 7px;border-radius:999px;font-size:9px;font-weight:900;'+style+'">'+esc(label)+'</span></td></tr>'}).join(''):'<tr><td colspan="7" style="text-align:center;padding:20px">No se encontraron valores en NoViajeCliente.</td></tr>';
  }
  async function handleFile(file){
    if(!file)return;const c=ensureCard(),sum=c?.querySelector('#hsExcelSummaryV8');if(sum)sum.textContent='Leyendo archivo y comparando hojas…';
    try{if(!window.XLSX)throw new Error('No está disponible el lector de Excel.');const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array',cellDates:true});const rows=extractRows(wb);const all=await systemFolios();lastRows=rows.map(x=>({...x,result:matchOne(x.ref,all)}));render(lastRows)}catch(e){if(sum)sum.innerHTML='<span style="color:#b91c1c;font-weight:800">'+esc(e.message||e)+'</span>'}
  }
  function reinforceControl(){
    const v=document.getElementById('hsViewControl');if(!v)return;const ths=v.querySelectorAll('thead th');if(ths.length&&![...ths].some(x=>/OPERADOR/i.test(x.textContent||''))){const tr=v.querySelector('thead tr'),th=document.createElement('th');th.textContent='OPERADOR';tr?.insertBefore(th,tr.children[3]||null)}
  }
  function install(){
    const tick=()=>{ensureCard();reinforceControl()};let tries=0;const t=setInterval(()=>{tries++;tick();if(tries>40)clearInterval(t)},300);
    document.addEventListener('click',e=>{if(e.target.closest?.('#ccPanelHojasServicio [data-hsv="Comprobacion"],#ccPanelHojasServicio [data-hsv="Control"]'))setTimeout(tick,120)},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,1400));else setTimeout(install,1400);
})();
