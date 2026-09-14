/* Tráfico App · Impresión QR · estable v7 · sin repintados periódicos */
(function(){
'use strict';
if(window.__CC_PRINT_QR_STABLE_V7__)return;
window.__CC_PRINT_QR_STABLE_V7__=true;

const SCAN='https://testerlb-cyber.github.io/ubicacion-cajas/unidad-ubicacion.html';
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const sb=()=>window.gmSupabase;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function rpc(name,args={}){const s=sb();if(!s)throw Error('Supabase no está disponible.');const r=await s.rpc(name,args);if(r.error)throw r.error;return r.data;}
async function load(){
  const data=await rpc('cc_load_all');
  const st=data?.state||{};
  const units=Array.isArray(st.cajas)?st.cajas:[];
  let typeMap=new Map();
  try{const m=await rpc('cc_unit_type_map');typeMap=new Map((m?.rows||[]).map(x=>[String(x.numero||'').trim().toUpperCase(),x]));}catch(_){/* fallback al estado */}
  return {units,typeMap};
}
function unitType(u,typeMap){
  const m=typeMap.get(String(u.numero||'').trim().toUpperCase());
  return String(m?.tipoUnidadGeneralNombre||u.tipoUnidadGeneralNombre||u.data?.tipoUnidadGeneralNombre||u.tipoUnidadNombre||u.tipo||'SIN TIPO').trim();
}
async function ensureQRLib(){if(window.QRCode)return;await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';s.onload=ok;s.onerror=()=>no(Error('No se pudo cargar el generador QR.'));document.head.appendChild(s);});}
async function tokenFor(id){const d=await rpc('cc_ensure_unit_qr_token',{p_unidad_id:id});const x=Array.isArray(d)?d[0]:d;if(!x?.ok||!x?.token)throw Error(x?.error||'No se pudo obtener token QR.');return String(x.token);}
async function qrData(url){await ensureQRLib();const h=document.createElement('div');h.style='position:fixed;left:-10000px;top:-10000px;width:340px;height:340px;background:#fff';document.body.appendChild(h);new QRCode(h,{text:url,width:320,height:320,correctLevel:QRCode.CorrectLevel.H});await sleep(150);const c=h.querySelector('canvas'),i=h.querySelector('img');const out=c?.toDataURL('image/png')||i?.src||'';h.remove();if(!out)throw Error('No se pudo construir el QR.');return out;}

function exportPDF(items){
  const JSPDF=window.jspdf?.jsPDF;if(!JSPDF)return alert('No está disponible el generador de PDF.');
  const doc=new JSPDF({orientation:'portrait',unit:'mm',format:'a4'}),qr=56,mx=10,my=10,cw=(210-mx*2)/3,ch=(297-my*2)/3;
  items.forEach((it,idx)=>{if(idx&&idx%9===0)doc.addPage('a4','portrait');const p=idx%9,row=Math.floor(p/3),col=p%3,x=mx+col*cw+(cw-qr)/2,y=my+row*ch+7;doc.setDrawColor(210,218,228);doc.roundedRect(mx+col*cw+1,my+row*ch+1,cw-2,ch-2,2,2,'S');doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(String(it.numero||'UNIDAD'),mx+col*cw+cw/2,my+row*ch+6,{align:'center'});doc.addImage(it.qr,'PNG',x,y,qr,qr,'','FAST');doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(80);const d=[it.tipo,it.descripcion].filter(Boolean).join(' · ').slice(0,44);if(d)doc.text(d,mx+col*cw+cw/2,y+qr+5,{align:'center',maxWidth:cw-6});doc.setFontSize(7);doc.text('Escanea para actualizar ubicación',mx+col*cw+cw/2,y+qr+10,{align:'center'});doc.setTextColor(0);});
  doc.save('QR_Unidades_9_por_pagina.pdf');
}
function preview(items){
  document.getElementById('ccQrPreviewV7')?.remove();
  const o=document.createElement('div');o.id='ccQrPreviewV7';o.style='position:fixed;inset:0;z-index:2147483646;background:rgba(15,23,42,.90);display:flex;align-items:center;justify-content:center;padding:8px';
  o.innerHTML='<div style="width:min(1000px,98vw);height:96vh;background:#eef2f7;border-radius:18px;overflow:hidden;display:flex;flex-direction:column"><div style="background:#0f172a;color:#fff;padding:13px 16px;display:flex;justify-content:space-between;align-items:center"><div><b>Vista previa · QR de ubicación</b><div style="font-size:11px;color:#cbd5e1">'+items.length+' QR seleccionados</div></div><button type="button" data-close style="border:0;background:none;color:#fff;font-size:26px">×</button></div><div style="flex:1;overflow:auto;padding:14px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px">'+items.map(x=>'<div style="background:#fff;border:1px solid #dbe2ea;border-radius:12px;padding:12px;text-align:center"><strong>'+esc(x.numero)+'</strong><div style="font-size:10px;color:#64748b;margin:3px 0 8px">'+esc([x.tipo,x.descripcion].filter(Boolean).join(' · '))+'</div><img src="'+x.qr+'" style="width:180px;max-width:90%;aspect-ratio:1;object-fit:contain"></div>').join('')+'</div></div><div style="padding:11px 14px;background:#fff;border-top:1px solid #cbd5e1;display:flex;gap:8px;justify-content:flex-end"><button type="button" class="cc-btn cc-btn-primary" data-pdf>Exportar PDF 3×3</button><button type="button" class="cc-btn cc-btn-light" data-close2>Cerrar</button></div></div>';
  document.body.appendChild(o);const close=()=>o.remove();o.querySelector('[data-close]').onclick=close;o.querySelector('[data-close2]').onclick=close;o.querySelector('[data-pdf]').onclick=()=>exportPDF(items);
}
async function open(){
  ['ccPrintUnitsModal','ccPrintV2Modal','ccPrintV3Modal','ccPrintQrV4','ccPrintQrV5','ccPrintQrV6','ccPrintQrV7'].forEach(id=>document.getElementById(id)?.remove());
  const o=document.createElement('div');o.id='ccPrintQrV7';o.style='position:fixed;inset:0;z-index:2147483645;background:rgba(15,23,42,.82);display:flex;align-items:center;justify-content:center;padding:10px';
  o.innerHTML='<div style="background:#fff;width:min(920px,98vw);height:min(94vh,900px);border-radius:18px;overflow:hidden;display:flex;flex-direction:column"><div style="background:#0f172a;color:#fff;padding:15px 18px;display:flex;justify-content:space-between;align-items:center"><div><b>Impresión · QR de unidades</b><div style="font-size:11px;color:#cbd5e1">Selecciona unidades y genera la vista previa.</div></div><button type="button" data-close style="border:0;background:none;color:#fff;font-size:26px">×</button></div><div style="padding:15px;overflow:auto;flex:1"><div data-loading style="color:#64748b">Cargando unidades…</div><div data-body style="display:none"><div style="display:grid;grid-template-columns:1fr 1.4fr;gap:10px;margin-bottom:10px"><div class="cc-field"><label>Tipo de unidad</label><select data-type><option value="TODOS">Todas</option></select></div><div class="cc-field"><label>Buscar</label><input data-search type="search" placeholder="Número o descripción"></div></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button type="button" class="cc-btn cc-btn-light" data-all>Seleccionar visibles</button><button type="button" class="cc-btn cc-btn-light" data-clear>Quitar selección</button></div><div style="display:flex;justify-content:space-between;margin:8px 0"><b data-count>0 seleccionadas</b><span data-visible style="font-size:11px;color:#64748b"></span></div><div data-list style="border:1px solid #dbe2ea;border-radius:12px;max-height:50vh;overflow:auto"></div></div></div><div style="padding:11px 14px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end"><button type="button" class="cc-btn cc-btn-primary" data-go>Generar QR</button><button type="button" class="cc-btn cc-btn-light" data-close2>Cerrar</button></div></div>';
  document.body.appendChild(o);const $=s=>o.querySelector(s),close=()=>o.remove();$('[data-close]').onclick=close;$('[data-close2]').onclick=close;
  try{
    const d=await load(),units=d.units,typeMap=d.typeMap,selected=new Set();
    const type=u=>unitType(u,typeMap),types=[...new Set(units.map(type).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    types.forEach(t=>{const op=document.createElement('option');op.value=t;op.textContent=t;$('[data-type]').appendChild(op);});
    const filtered=()=>{const q=String($('[data-search]').value||'').trim().toLowerCase(),t=$('[data-type]').value;return units.filter(u=>(t==='TODOS'||type(u)===t)&&(!q||[u.numero,u.descripcion,u.placasMx,u.placasUsa,type(u)].some(v=>String(v||'').toLowerCase().includes(q))))};
    const render=()=>{const xs=filtered();$('[data-visible]').textContent=xs.length+' visibles';$('[data-count]').textContent=selected.size+' seleccionada'+(selected.size===1?'':'s');$('[data-list]').innerHTML=xs.map(u=>'<label style="display:grid;grid-template-columns:30px 1fr auto;gap:10px;align-items:center;padding:12px;border-bottom:1px solid #e2e8f0;cursor:pointer"><input type="checkbox" data-unit="'+esc(u.id)+'" '+(selected.has(String(u.id))?'checked':'')+'><span><b>'+esc(u.numero||'Sin número')+'</b><small style="display:block;color:#64748b">'+esc(u.descripcion||'')+'</small></span><span class="cc-badge">'+esc(type(u))+'</span></label>').join('')||'<div style="padding:18px;color:#64748b">No hay unidades.</div>';$('[data-list]').querySelectorAll('[data-unit]').forEach(c=>c.onchange=()=>{c.checked?selected.add(String(c.dataset.unit)):selected.delete(String(c.dataset.unit));render();});};
    $('[data-type]').onchange=render;$('[data-search]').oninput=render;$('[data-all]').onclick=()=>{filtered().forEach(u=>selected.add(String(u.id)));render();};$('[data-clear]').onclick=()=>{selected.clear();render();};
    $('[data-go]').onclick=async()=>{if(!selected.size)return alert('Selecciona al menos una unidad.');const b=$('[data-go]'),old=b.textContent;b.disabled=true;b.textContent='Generando…';try{const items=[];for(const u of units.filter(x=>selected.has(String(x.id)))){const token=await tokenFor(String(u.id));items.push({numero:u.numero,descripcion:u.descripcion,tipo:type(u),qr:await qrData(SCAN+'?token='+encodeURIComponent(token))});}preview(items);}catch(e){console.error(e);alert('No se pudo generar el QR.\n\n'+(e.message||e));}finally{if(b.isConnected){b.disabled=false;b.textContent=old;}}};
    $('[data-loading]').style.display='none';$('[data-body]').style.display='block';render();
  }catch(e){$('[data-loading]').textContent='No se pudieron cargar las unidades: '+(e.message||e);}
}

function ensureInventoryButton(){
  const panel=document.getElementById('ccPanelInventario');if(!panel)return false;
  const toolbar=[...panel.querySelectorAll('.cc-toolbar')].find(x=>(x.textContent||'').includes('Inventario de unidades'));if(!toolbar)return false;
  const actions=toolbar.querySelector('.cc-actions')||toolbar;
  ['ccInvPrintQr_20260913','ccInvPrintQrMoved','ccInventoryPrintQrDirectV61'].forEach(id=>document.getElementById(id)?.remove());
  let b=document.getElementById('ccInventoryPrintQrStableV7');
  if(!b){b=document.createElement('button');b.type='button';b.id='ccInventoryPrintQrStableV7';b.className='cc-btn cc-btn-primary';b.innerHTML='<i class="fa-solid fa-qrcode mr-1"></i>Imprimir QR';b.onclick=e=>{e.preventDefault();open();};}
  const add=actions.querySelector('button[onclick*="ccNuevaCaja"]');
  if(!b.isConnected){if(add)actions.insertBefore(b,add);else actions.appendChild(b);}
  return true;
}
function bind(){
  ensureInventoryButton();
  document.addEventListener('click',e=>{const tab=e.target.closest?.('#controlCajasSection .cc-tab');if(tab&&(tab.getAttribute('onclick')||'').includes("ccTab('inventario'")))setTimeout(ensureInventoryButton,0);},true);
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-config-placeholder="impresion"]');if(!b)return;e.preventDefault();e.stopPropagation();open();},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.ccOpenPrintV3=open;window.ccOpenPrintQrV7=open;
})();
