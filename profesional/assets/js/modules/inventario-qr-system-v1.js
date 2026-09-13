/* Tráfico App · Sistema QR de unidades v1 · único flujo */
(function(){
  if(window.__CC_UNIT_QR_SYSTEM_V1__) return;
  window.__CC_UNIT_QR_SYSTEM_V1__=true;

  const PUBLIC_SCAN='https://testerlb-cyber.github.io/ubicacion-cajas/unidad-ubicacion.html';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
  const wait=ms=>new Promise(r=>setTimeout(r,ms));

  function inventoryRows(){
    const body=document.getElementById('ccInventarioBody');
    if(!body) return [];
    return [...body.querySelectorAll('tr')].map(row=>{
      const edit=row.querySelector('button[onclick*="ccEditarUnidadDirecto"]');
      const code=edit?.getAttribute('onclick')||'';
      const m=code.match(/ccEditarUnidadDirecto\('([^']+)'\)/);
      if(!m) return null;
      const c=[...row.querySelectorAll('td')];
      return {
        id:m[1],
        tipo:(c[1]?.innerText||'').trim().split('\n')[0],
        numero:(c[2]?.innerText||'').trim().split('\n')[0],
        descripcion:(c[3]?.innerText||'').trim().split('\n')[0]
      };
    }).filter(Boolean);
  }

  function importButton(){
    const panel=document.getElementById('ccPanelInventario');
    if(!panel) return null;
    return panel.querySelector('button[onclick*="ccAbrirImportarUnidades"]') || [...panel.querySelectorAll('button')].find(b=>/importar\s+unidades/i.test(b.textContent||''));
  }

  function ensureButton(){
    const imp=importButton();
    if(!imp) return false;
    let btn=document.getElementById('ccUnitQrMainBtn');
    if(!btn){
      btn=document.createElement('button');
      btn.id='ccUnitQrMainBtn';
      btn.type='button';
      btn.className='cc-btn cc-btn-primary';
      btn.innerHTML='<i class="fa-solid fa-qrcode mr-1"></i>Generar QR';
      btn.title='Generar e imprimir QR de una o varias unidades';
      btn.onclick=openModal;
    }
    btn.style.cssText='display:inline-flex!important;visibility:visible!important;opacity:1!important;align-items:center!important;padding:7px 10px!important;font-size:10px!important;font-weight:900!important;margin:0!important;';
    if(imp.nextElementSibling!==btn) imp.insertAdjacentElement('afterend',btn);
    return true;
  }

  function openModal(){
    document.getElementById('ccUnitQrModal')?.remove();
    const units=inventoryRows();
    const ov=document.createElement('div');
    ov.id='ccUnitQrModal';
    ov.style='position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.76);display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML=`<div style="width:min(900px,96vw);max-height:92vh;background:#fff;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 70px rgba(0,0,0,.35)">
      <div style="padding:15px 18px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:12px"><div><b>Generar QR de unidades</b><div style="font-size:10px;color:#cbd5e1;margin-top:3px">Selecciona una o varias unidades. El PDF queda listo para imprimir.</div></div><button id="ccUnitQrClose" type="button" style="border:0;background:none;color:#fff;font-size:22px">×</button></div>
      <div style="padding:12px 16px;border-bottom:1px solid #e2e8f0;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input id="ccUnitQrSearch" type="search" placeholder="Buscar unidad..." style="flex:1;min-width:220px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px"><button id="ccUnitQrAll" type="button" class="cc-btn cc-btn-light">Seleccionar todas</button><button id="ccUnitQrNone" type="button" class="cc-btn cc-btn-light">Quitar selección</button><b id="ccUnitQrCount" style="font-size:10px;color:#475569">0 seleccionadas</b></div>
      <div id="ccUnitQrList" style="padding:8px 16px;overflow:auto;min-height:260px;flex:1">${units.length?units.map(u=>`<label data-search="${esc((u.numero+' '+u.descripcion+' '+u.tipo).toLowerCase())}" style="display:flex;align-items:center;gap:10px;padding:9px 6px;border-bottom:1px solid #f1f5f9;cursor:pointer"><input class="ccUnitQrCheck" type="checkbox" value="${esc(u.id)}" data-numero="${esc(u.numero)}" data-descripcion="${esc(u.descripcion)}" data-tipo="${esc(u.tipo)}"><div><b>${esc(u.numero||'Unidad')}</b><div style="font-size:10px;color:#64748b">${esc([u.tipo,u.descripcion].filter(Boolean).join(' · '))}</div></div></label>`).join(''):'<div style="padding:30px;text-align:center;color:#64748b">No hay unidades visibles en el inventario.</div>'}</div>
      <div style="padding:12px 16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><span style="font-size:10px;color:#64748b">6 etiquetas por hoja · cada QR abre la página pública de ubicación.</span><div style="display:flex;gap:8px"><button id="ccUnitQrCancel" type="button" class="cc-btn cc-btn-light">Cancelar</button><button id="ccUnitQrPdf" type="button" class="cc-btn cc-btn-primary"><i class="fa-solid fa-file-pdf mr-1"></i>Generar PDF</button></div></div>
    </div>`;
    document.body.appendChild(ov);
    const update=()=>ov.querySelector('#ccUnitQrCount').textContent=ov.querySelectorAll('.ccUnitQrCheck:checked').length+' seleccionadas';
    ov.querySelector('#ccUnitQrClose').onclick=()=>ov.remove();
    ov.querySelector('#ccUnitQrCancel').onclick=()=>ov.remove();
    ov.querySelector('#ccUnitQrAll').onclick=()=>{ov.querySelectorAll('#ccUnitQrList label').forEach(l=>{if(l.style.display!=='none')l.querySelector('input').checked=true;});update();};
    ov.querySelector('#ccUnitQrNone').onclick=()=>{ov.querySelectorAll('.ccUnitQrCheck').forEach(x=>x.checked=false);update();};
    ov.querySelector('#ccUnitQrSearch').oninput=e=>{const q=e.target.value.trim().toLowerCase();ov.querySelectorAll('#ccUnitQrList label').forEach(l=>l.style.display=!q||l.dataset.search.includes(q)?'flex':'none');};
    ov.querySelectorAll('.ccUnitQrCheck').forEach(x=>x.onchange=update);
    ov.querySelector('#ccUnitQrPdf').onclick=()=>generatePdf(ov);
  }

  async function ensureQrLib(){
    if(window.QRCode) return;
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
  }

  async function tokenFor(id){
    const sb=window.gmSupabase;
    if(!sb) throw new Error('Supabase no está disponible.');
    const {data,error}=await sb.rpc('cc_ensure_unit_qr_token',{p_unidad_id:id});
    if(error) throw error;
    const d=Array.isArray(data)?data[0]:data;
    if(!d?.ok) throw new Error(d?.error||'No se pudo generar el token QR.');
    if(!d.token) throw new Error('Supabase no devolvió token QR.');
    return String(d.token);
  }

  async function makeQr(text){
    const h=document.createElement('div');h.style='position:fixed;left:-9999px;top:-9999px;width:280px;height:280px';document.body.appendChild(h);
    new QRCode(h,{text,width:280,height:280,correctLevel:QRCode.CorrectLevel.H});await wait(100);
    const canvas=h.querySelector('canvas'),img=h.querySelector('img');const out=canvas?canvas.toDataURL('image/png'):(img?.src||'');h.remove();if(!out)throw new Error('No se pudo crear la imagen QR.');return out;
  }

  async function generatePdf(ov){
    const selected=[...ov.querySelectorAll('.ccUnitQrCheck:checked')].map(x=>({id:x.value,numero:x.dataset.numero,descripcion:x.dataset.descripcion,tipo:x.dataset.tipo}));
    if(!selected.length){alert('Selecciona al menos una unidad.');return;}
    const btn=ov.querySelector('#ccUnitQrPdf'),old=btn.innerHTML;btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin mr-1"></i>Generando...';
    try{
      await ensureQrLib(); const JsPDF=window.jspdf?.jsPDF;if(!JsPDF)throw new Error('jsPDF no está disponible.');
      const items=[];
      for(const u of selected){const token=await tokenFor(u.id);const url=PUBLIC_SCAN+'?token='+encodeURIComponent(token);items.push({...u,qr:await makeQr(url)});}
      const pdf=new JsPDF({orientation:'portrait',unit:'mm',format:'letter'});const W=215.9,H=279.4,M=10,G=5,CW=(W-M*2-G)/2,CH=(H-M*2-G*2)/3;
      items.forEach((u,i)=>{if(i&&i%6===0)pdf.addPage();const p=i%6,col=p%2,row=Math.floor(p/2),x=M+col*(CW+G),y=M+row*(CH+G);pdf.setDrawColor(210);pdf.roundedRect(x,y,CW,CH,3,3);pdf.setFont('helvetica','bold');pdf.setFontSize(14);pdf.text(u.numero||'UNIDAD',x+CW/2,y+10,{align:'center'});pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text([u.tipo,u.descripcion].filter(Boolean).join(' · ').slice(0,50),x+CW/2,y+16,{align:'center'});const q=Math.min(58,CW-18,CH-32);pdf.addImage(u.qr,'PNG',x+(CW-q)/2,y+20,q,q);pdf.setFontSize(7);pdf.text('Escanear para actualizar ubicación',x+CW/2,y+CH-7,{align:'center'});});
      pdf.save((selected.length===1?'QR_'+selected[0].numero:'QR_UNIDADES_'+selected.length).replace(/[^A-Za-z0-9_.-]/g,'_')+'.pdf');ov.remove();
    }catch(e){console.error('UNIT QR SYSTEM:',e);alert('No se pudo generar el PDF de QR.\n\n'+(e.message||e));}
    finally{btn.disabled=false;btn.innerHTML=old;}
  }

  window.ccOpenUnitQrGenerator=openModal;
  function apply(){ensureButton();}
  const original=window.ccRenderInventario;
  if(typeof original==='function'&&!original.__unitQrSystemV1){const w=function(){const r=original.apply(this,arguments);setTimeout(apply,0);requestAnimationFrame(apply);return r;};w.__unitQrSystemV1=true;window.ccRenderInventario=w;}
  apply();
  const t=setInterval(()=>{if(ensureButton())clearInterval(t);},300);setTimeout(()=>clearInterval(t),15000);
  document.addEventListener('click',e=>{const tab=e.target.closest?.('#controlCajasSection .cc-tab');if(tab&&(tab.getAttribute('onclick')||'').includes("ccTab('inventario'")){setTimeout(apply,30);setTimeout(apply,250);}},true);
  window.addEventListener('load',()=>setTimeout(apply,150));
})();
