/* Tráfico App · Sistema QR de unidades · vista previa + PDF */
(function(){
 if(window.__CC_UNIT_QR_SYSTEM_V2__)return;window.__CC_UNIT_QR_SYSTEM_V2__=true;
 const SCAN='https://testerlb-cyber.github.io/ubicacion-cajas/unidad-ubicacion.html';
 const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 let previewItems=[];

 function rows(){
  const b=document.getElementById('ccInventarioBody');if(!b)return[];
  return[...b.querySelectorAll('tr')].map(r=>{
   const e=r.querySelector('button[onclick*="ccEditarUnidadDirecto"]');
   const m=(e?.getAttribute('onclick')||'').match(/ccEditarUnidadDirecto\('([^']+)'\)/);if(!m)return null;
   const c=[...r.querySelectorAll('td')];
   return{id:m[1],tipo:(c[1]?.innerText||'').trim().split('\n')[0],numero:(c[2]?.innerText||'').trim().split('\n')[0],descripcion:(c[3]?.innerText||'').trim().split('\n')[0]};
  }).filter(Boolean);
 }
 function cleanRowActions(){
  const b=document.getElementById('ccInventarioBody');if(!b)return;
  b.querySelectorAll('tr').forEach(r=>{
   const a=r.querySelector('td:last-child');if(!a)return;
   [...a.querySelectorAll('button,a')].forEach(x=>{
    const txt=(x.textContent||'').trim().toUpperCase();
    if(txt==='PDF'||txt.includes('GENERAR PDF')||x.matches('[data-inventario-pdf],[title*="PDF" i]'))x.remove();
   });
  });
 }
 function imp(){const p=document.getElementById('ccPanelInventario');return p&&(p.querySelector('button[onclick*="ccAbrirImportarUnidades"]')||[...p.querySelectorAll('button')].find(b=>/importar\s+unidades/i.test(b.textContent||'')));}
 function place(){
  cleanRowActions();const i=imp();if(!i)return false;
  let b=document.getElementById('ccUnitQrMainBtn');
  if(!b){b=document.createElement('button');b.id='ccUnitQrMainBtn';b.type='button';b.className='cc-btn cc-btn-primary';b.onclick=openSelector;}
  b.innerHTML='<i class="fa-solid fa-qrcode mr-1"></i>Imprimir QR';
  b.style.cssText='display:inline-flex!important;visibility:visible!important;opacity:1!important;align-items:center!important;padding:7px 10px!important;font-size:10px!important;font-weight:900!important;margin:0!important;';
  if(i.nextElementSibling!==b)i.insertAdjacentElement('afterend',b);return true;
 }
 function overlay(id,inner){document.getElementById(id)?.remove();const o=document.createElement('div');o.id=id;o.style='position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.76);display:flex;align-items:center;justify-content:center;padding:16px';o.innerHTML=inner;document.body.appendChild(o);return o;}
 function openSelector(){
  const us=rows();
  const o=overlay('ccUnitQrModal',`<div style="width:min(900px,96vw);max-height:92vh;background:#fff;border-radius:16px;overflow:hidden;display:flex;flex-direction:column"><div style="padding:15px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between"><div><b>Imprimir QR de unidades</b><div style="font-size:10px;color:#cbd5e1">Selecciona las unidades y revisa la vista previa antes de exportar o imprimir.</div></div><button data-close type="button" style="border:0;background:none;color:#fff;font-size:22px">×</button></div><div style="padding:12px 16px;border-bottom:1px solid #e2e8f0;display:flex;gap:8px;flex-wrap:wrap"><input id="ccUnitQrSearch" type="search" placeholder="Buscar unidad..." style="flex:1;min-width:220px;padding:8px;border:1px solid #cbd5e1;border-radius:8px"><button id="ccUnitQrAll" class="cc-btn cc-btn-light" type="button">Seleccionar todas</button><button id="ccUnitQrNone" class="cc-btn cc-btn-light" type="button">Quitar selección</button><b id="ccUnitQrCount" style="font-size:10px">0 seleccionadas</b></div><div id="ccUnitQrList" style="padding:8px 16px;overflow:auto;min-height:260px;flex:1">${us.map(u=>`<label data-search="${esc((u.numero+' '+u.descripcion+' '+u.tipo).toLowerCase())}" style="display:flex;gap:10px;padding:9px 6px;border-bottom:1px solid #f1f5f9"><input class="ccUnitQrCheck" type="checkbox" value="${esc(u.id)}" data-numero="${esc(u.numero)}" data-descripcion="${esc(u.descripcion)}" data-tipo="${esc(u.tipo)}"><div><b>${esc(u.numero||'Unidad')}</b><div style="font-size:10px;color:#64748b">${esc([u.tipo,u.descripcion].filter(Boolean).join(' · '))}</div></div></label>`).join('')||'<div style="padding:30px;text-align:center">No hay unidades visibles.</div>'}</div><div style="padding:12px 16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:10px"><span style="font-size:10px;color:#64748b">9 etiquetas por hoja · QR aprox. 5.5 cm.</span><div><button data-close class="cc-btn cc-btn-light" type="button">Cancelar</button> <button id="ccUnitQrPreview" class="cc-btn cc-btn-primary" type="button"><i class="fa-solid fa-eye mr-1"></i>Vista previa</button></div></div></div>`);
  const upd=()=>o.querySelector('#ccUnitQrCount').textContent=o.querySelectorAll('.ccUnitQrCheck:checked').length+' seleccionadas';
  o.querySelectorAll('[data-close]').forEach(x=>x.onclick=()=>o.remove());
  o.querySelector('#ccUnitQrAll').onclick=()=>{o.querySelectorAll('#ccUnitQrList label').forEach(l=>{if(l.style.display!=='none')l.querySelector('input').checked=true});upd();};
  o.querySelector('#ccUnitQrNone').onclick=()=>{o.querySelectorAll('.ccUnitQrCheck').forEach(x=>x.checked=false);upd();};
  o.querySelector('#ccUnitQrSearch').oninput=e=>{const q=e.target.value.trim().toLowerCase();o.querySelectorAll('#ccUnitQrList label').forEach(l=>l.style.display=!q||l.dataset.search.includes(q)?'flex':'none');};
  o.querySelectorAll('.ccUnitQrCheck').forEach(x=>x.onchange=upd);
  o.querySelector('#ccUnitQrPreview').onclick=()=>preparePreview(o);
 }
 async function qrlib(){if(window.QRCode)return;await new Promise((r,j)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';s.onload=r;s.onerror=j;document.head.appendChild(s);});}
 async function token(id){const s=window.gmSupabase;if(!s)throw Error('Supabase no está disponible.');const{data,error}=await s.rpc('cc_ensure_unit_qr_token',{p_unidad_id:id});if(error)throw error;const d=Array.isArray(data)?data[0]:data;if(!d?.ok||!d.token)throw Error(d?.error||'No se pudo obtener token QR.');return String(d.token);}
 async function img(text){const h=document.createElement('div');h.style='position:fixed;left:-9999px;top:-9999px';document.body.appendChild(h);new QRCode(h,{text,width:300,height:300,correctLevel:QRCode.CorrectLevel.H});await wait(100);const c=h.querySelector('canvas'),i=h.querySelector('img'),out=c?c.toDataURL('image/png'):(i?.src||'');h.remove();if(!out)throw Error('No se pudo crear QR.');return out;}
 async function preparePreview(o){
  const ss=[...o.querySelectorAll('.ccUnitQrCheck:checked')].map(x=>({id:x.value,numero:x.dataset.numero,descripcion:x.dataset.descripcion,tipo:x.dataset.tipo}));if(!ss.length)return alert('Selecciona al menos una unidad.');
  const b=o.querySelector('#ccUnitQrPreview'),old=b.innerHTML;b.disabled=true;b.textContent='Preparando...';
  try{await qrlib();previewItems=[];for(const u of ss){const t=await token(u.id),url=SCAN+'?token='+encodeURIComponent(t);previewItems.push({...u,url,qr:await img(url)});}o.remove();showPreview();}catch(e){console.error(e);alert('No se pudo preparar la vista previa.\n\n'+(e.message||e));}finally{b.disabled=false;b.innerHTML=old;}
 }
 function previewPagesHtml(){
  const pages=[];for(let i=0;i<previewItems.length;i+=9)pages.push(previewItems.slice(i,i+9));
  return pages.map(pg=>`<div class="ccQrPrintPage" style="width:min(816px,100%);aspect-ratio:215.9/279.4;margin:0 auto 18px;background:#fff;padding:2.8%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:1.2%;box-shadow:0 5px 20px rgba(15,23,42,.15)">${pg.map(u=>`<div style="border:1px solid #d1d5db;border-radius:6px;padding:6px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;overflow:hidden"><b style="font-size:13px">${esc(u.numero||'UNIDAD')}</b><div style="font-size:8px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;text-align:center">${esc([u.tipo,u.descripcion].filter(Boolean).join(' · '))}</div><img src="${u.qr}" style="width:min(76%,165px);aspect-ratio:1;margin-top:5px"><div style="font-size:7px;margin-top:auto;color:#475569">Escanear para actualizar ubicación</div></div>`).join('')}${Array.from({length:9-pg.length},()=>'<div></div>').join('')}</div>`).join('');
 }
 function showPreview(){
  const pageCount=Math.max(1,Math.ceil(previewItems.length/9));
  const o=overlay('ccUnitQrPreviewModal',`<div style="width:min(1100px,98vw);max-height:95vh;background:#f1f5f9;border-radius:16px;overflow:hidden;display:flex;flex-direction:column"><div style="padding:14px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center"><div><b>Vista previa · Imprimir QR</b><div style="font-size:10px;color:#cbd5e1">${previewItems.length} QR · ${pageCount} página(s) · 3×3 por hoja</div></div><button data-close style="border:0;background:none;color:#fff;font-size:22px">×</button></div><div id="ccUnitQrPreviewPages" style="padding:16px;overflow:auto;flex:1">${previewPagesHtml()}</div><div style="padding:12px 16px;background:#fff;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-size:10px;color:#64748b">Primero revisa la vista previa; después puedes exportar PDF o imprimir directamente.</span><div><button id="ccUnitQrBack" class="cc-btn cc-btn-light" type="button">Volver</button> <button id="ccUnitQrPrint" class="cc-btn cc-btn-light" type="button"><i class="fa-solid fa-print mr-1"></i>Imprimir</button> <button id="ccUnitQrExport" class="cc-btn cc-btn-primary" type="button"><i class="fa-solid fa-file-pdf mr-1"></i>Exportar PDF</button></div></div></div>`);
  o.querySelector('[data-close]').onclick=()=>o.remove();
  o.querySelector('#ccUnitQrBack').onclick=()=>{o.remove();openSelector();};
  o.querySelector('#ccUnitQrPrint').onclick=printPreview;
  o.querySelector('#ccUnitQrExport').onclick=exportPdf;
 }
 function printPreview(){
  const body=previewPagesHtml();
  const w=window.open('','_blank','noopener,noreferrer');
  if(!w){alert('El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para imprimir.');return;}
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Imprimir QR</title><style>@page{size:letter portrait;margin:7mm}*{box-sizing:border-box}body{margin:0;background:#fff;font-family:Arial,sans-serif}.ccQrPrintPage{width:201.9mm!important;height:265.4mm!important;aspect-ratio:auto!important;margin:0 auto!important;padding:0!important;display:grid!important;grid-template-columns:repeat(3,1fr)!important;grid-template-rows:repeat(3,1fr)!important;gap:3mm!important;box-shadow:none!important;page-break-after:always}.ccQrPrintPage:last-child{page-break-after:auto}.ccQrPrintPage>div{border:1px solid #d1d5db!important;border-radius:2mm!important;padding:2mm!important}.ccQrPrintPage img{width:55mm!important;height:55mm!important;object-fit:contain!important}</style></head><body>${body}<script>window.onload=function(){setTimeout(function(){window.print()},150)}<\/script></body></html>`);
  w.document.close();
 }
 function exportPdf(){
  try{const J=window.jspdf?.jsPDF;if(!J)throw Error('jsPDF no está disponible.');const d=new J({orientation:'portrait',unit:'mm',format:'letter'}),W=215.9,H=279.4,M=7,G=3,COLS=3,ROWS=3,CW=(W-M*2-G*(COLS-1))/COLS,CH=(H-M*2-G*(ROWS-1))/ROWS,QR=55;previewItems.forEach((u,n)=>{if(n&&n%9===0)d.addPage();const p=n%9,col=p%3,row=Math.floor(p/3),x=M+col*(CW+G),y=M+row*(CH+G);d.setDrawColor(210);d.roundedRect(x,y,CW,CH,2,2);d.setFont('helvetica','bold');d.setFontSize(11);d.text(u.numero||'UNIDAD',x+CW/2,y+7,{align:'center'});d.setFont('helvetica','normal');d.setFontSize(6.5);const detail=[u.tipo,u.descripcion].filter(Boolean).join(' · ').slice(0,38);if(detail)d.text(detail,x+CW/2,y+12,{align:'center'});const q=Math.min(QR,CW-8,CH-24);d.addImage(u.qr,'PNG',x+(CW-q)/2,y+15,q,q);d.setFontSize(6);d.text('Escanear para actualizar ubicación',x+CW/2,y+CH-4,{align:'center'});});d.save((previewItems.length===1?'QR_'+previewItems[0].numero:'QR_UNIDADES_'+previewItems.length).replace(/[^A-Za-z0-9_.-]/g,'_')+'.pdf');}catch(e){console.error(e);alert('No se pudo exportar el PDF.\n\n'+(e.message||e));}
 }
 window.ccOpenUnitQrGenerator=openSelector;
 const original=window.ccRenderInventario;if(typeof original==='function'&&!original.__unitQrV2){const w=function(){const r=original.apply(this,arguments);setTimeout(()=>{place();cleanRowActions();},0);return r;};w.__unitQrV2=true;window.ccRenderInventario=w;}
 place();cleanRowActions();const t=setInterval(()=>{place();cleanRowActions();},600);setTimeout(()=>clearInterval(t),15000);document.addEventListener('click',e=>{const x=e.target.closest?.('#controlCajasSection .cc-tab');if(x&&(x.getAttribute('onclick')||'').includes("ccTab('inventario'"))setTimeout(()=>{place();cleanRowActions();},50);},true);
})();