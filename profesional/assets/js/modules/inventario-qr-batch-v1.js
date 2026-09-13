/* Tráfico App · Inventario · Generador masivo de QR v1 */
(function(){
  if(window.__INVENTARIO_QR_BATCH_V1__) return;
  window.__INVENTARIO_QR_BATCH_V1__=true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function getRows(){
    const body=document.getElementById('ccInventarioBody');
    if(!body) return [];
    return [...body.querySelectorAll('tr')].map(row=>{
      const edit=row.querySelector('button[onclick*="ccEditarUnidadDirecto"]');
      const code=edit?.getAttribute('onclick')||'';
      const m=code.match(/ccEditarUnidadDirecto\('([^']+)'\)/);
      if(!m) return null;
      const cells=[...row.querySelectorAll('td')];
      const numero=(cells[1]?.innerText||cells[0]?.innerText||'').trim().split('\n')[0].trim();
      const descripcion=(cells[2]?.innerText||'').trim().split('\n')[0].trim();
      return {id:m[1],numero,descripcion};
    }).filter(Boolean);
  }

  function ensureButton(){
    const panel=document.getElementById('ccPanelInventario');
    if(!panel||document.getElementById('ccQrBatchBtn')) return;
    const btn=document.createElement('button');
    btn.id='ccQrBatchBtn';
    btn.type='button';
    btn.className='cc-btn cc-btn-primary';
    btn.innerHTML='<i class="fa-solid fa-qrcode mr-1"></i> Generar QR';
    btn.style.cssText='margin:0 0 12px 0!important;padding:8px 12px!important;font-size:11px!important;font-weight:800!important;display:inline-flex!important;align-items:center!important;gap:4px!important;';
    btn.onclick=openModal;
    const first=panel.firstElementChild;
    panel.insertBefore(btn,first||null);
  }

  function openModal(){
    document.getElementById('ccQrBatchModal')?.remove();
    const units=getRows();
    const ov=document.createElement('div');
    ov.id='ccQrBatchModal';
    ov.style='position:fixed;inset:0;background:rgba(15,23,42,.72);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML=`<div style="background:#fff;width:min(920px,96vw);max-height:92vh;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.35);display:flex;flex-direction:column;overflow:hidden">
      <div style="padding:15px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center">
        <div><strong style="font-size:15px">Generar QR de unidades</strong><div style="font-size:10px;color:#cbd5e1;margin-top:2px">Selecciona una o varias unidades para crear un PDF listo para imprimir.</div></div>
        <button type="button" id="ccQrBatchClose" style="background:none;border:0;color:#fff;font-size:22px;cursor:pointer">×</button>
      </div>
      <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input id="ccQrBatchSearch" placeholder="Buscar unidad..." style="flex:1;min-width:220px;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font-size:12px">
        <button type="button" id="ccQrBatchAll" class="cc-btn cc-btn-light">Seleccionar todas</button>
        <button type="button" id="ccQrBatchNone" class="cc-btn cc-btn-light">Quitar selección</button>
        <span id="ccQrBatchCount" style="font-size:11px;font-weight:800;color:#334155">0 seleccionadas</span>
      </div>
      <div id="ccQrBatchList" style="padding:10px 16px;overflow:auto;flex:1;min-height:260px">
        ${units.length?units.map(u=>`<label data-search="${esc((u.numero+' '+u.descripcion).toLowerCase())}" style="display:flex;align-items:center;gap:10px;padding:9px 8px;border-bottom:1px solid #f1f5f9;cursor:pointer"><input class="ccQrBatchCheck" type="checkbox" value="${esc(u.id)}" data-numero="${esc(u.numero)}" data-descripcion="${esc(u.descripcion)}"><div><b style="font-size:12px;color:#0f172a">${esc(u.numero||'Unidad')}</b><div style="font-size:10px;color:#64748b">${esc(u.descripcion||'')}</div></div></label>`).join(''):'<div style="padding:30px;text-align:center;color:#64748b">No se encontraron unidades en el listado.</div>'}
      </div>
      <div style="padding:12px 16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <div style="font-size:10px;color:#64748b">Formato: hasta 6 etiquetas QR por hoja.</div>
        <div style="display:flex;gap:8px"><button type="button" id="ccQrBatchCancel" class="cc-btn cc-btn-light">Cancelar</button><button type="button" id="ccQrBatchGenerate" class="cc-btn cc-btn-primary"><i class="fa-solid fa-file-pdf mr-1"></i>Generar PDF</button></div>
      </div>
    </div>`;
    document.body.appendChild(ov);
    const checks=()=>[...ov.querySelectorAll('.ccQrBatchCheck')].filter(x=>x.closest('label').style.display!=='none');
    const update=()=>{ov.querySelector('#ccQrBatchCount').textContent=ov.querySelectorAll('.ccQrBatchCheck:checked').length+' seleccionadas';};
    ov.querySelector('#ccQrBatchClose').onclick=()=>ov.remove();
    ov.querySelector('#ccQrBatchCancel').onclick=()=>ov.remove();
    ov.querySelector('#ccQrBatchAll').onclick=()=>{checks().forEach(x=>x.checked=true);update();};
    ov.querySelector('#ccQrBatchNone').onclick=()=>{ov.querySelectorAll('.ccQrBatchCheck').forEach(x=>x.checked=false);update();};
    ov.querySelector('#ccQrBatchSearch').oninput=e=>{const q=e.target.value.trim().toLowerCase();ov.querySelectorAll('#ccQrBatchList label').forEach(l=>l.style.display=!q||l.dataset.search.includes(q)?'flex':'none');};
    ov.querySelectorAll('.ccQrBatchCheck').forEach(x=>x.onchange=update);
    ov.querySelector('#ccQrBatchGenerate').onclick=()=>generatePdf(ov);
  }

  async function loadQrLib(){
    if(window.QRCode) return;
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    });
  }

  async function tokenFor(id){
    const sb=window.gmSupabase;
    if(!sb) throw new Error('Supabase no está disponible.');
    const {data,error}=await sb.rpc('cc_ensure_unit_qr_token',{p_unidad_id:id});
    if(error) throw error;
    const d=Array.isArray(data)?data[0]:data;
    if(d?.ok===false) throw new Error(d.error||'No se pudo obtener el QR de la unidad.');
    const token=d?.qr_token||d?.token||d?.qrToken||d?.value||d;
    if(!token||typeof token==='object') throw new Error('No se pudo obtener el token QR de la unidad.');
    return String(token);
  }

  async function qrDataUrl(text){
    const holder=document.createElement('div');
    holder.style.cssText='position:fixed;left:-9999px;top:-9999px;width:256px;height:256px';
    document.body.appendChild(holder);
    new QRCode(holder,{text,width:256,height:256,correctLevel:QRCode.CorrectLevel.H});
    await sleep(80);
    const canvas=holder.querySelector('canvas');
    const img=holder.querySelector('img');
    let data='';
    if(canvas) data=canvas.toDataURL('image/png');
    else if(img) data=img.src;
    holder.remove();
    if(!data) throw new Error('No se pudo crear la imagen QR.');
    return data;
  }

  async function generatePdf(modal){
    const selected=[...modal.querySelectorAll('.ccQrBatchCheck:checked')].map(x=>({id:x.value,numero:x.dataset.numero||'',descripcion:x.dataset.descripcion||''}));
    if(!selected.length){alert('Selecciona al menos una unidad.');return;}
    const btn=modal.querySelector('#ccQrBatchGenerate');
    const old=btn.innerHTML;btn.disabled=true;btn.innerHTML='<i class="fa-solid fa-spinner fa-spin mr-1"></i>Generando...';
    try{
      await loadQrLib();
      const jsPDF=window.jspdf?.jsPDF;
      if(!jsPDF) throw new Error('El generador PDF no está disponible.');
      const items=[];
      for(let i=0;i<selected.length;i++){
        const u=selected[i];
        const token=await tokenFor(u.id);
        const url=new URL('../ubicacion.html',location.href).href+'?token='+encodeURIComponent(token);
        const qr=await qrDataUrl(url);
        items.push({...u,url,qr});
      }
      const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'letter'});
      const pageW=215.9,pageH=279.4,margin=10,gap=5;
      const cellW=(pageW-margin*2-gap)/2,cellH=(pageH-margin*2-gap*2)/3;
      items.forEach((u,i)=>{
        if(i>0&&i%6===0) pdf.addPage();
        const p=i%6,col=p%2,row=Math.floor(p/2);
        const x=margin+col*(cellW+gap),y=margin+row*(cellH+gap);
        pdf.setDrawColor(210);pdf.roundedRect(x,y,cellW,cellH,3,3);
        pdf.setFont('helvetica','bold');pdf.setFontSize(13);pdf.text(u.numero||'UNIDAD',x+cellW/2,y+9,{align:'center'});
        pdf.setFont('helvetica','normal');pdf.setFontSize(8);
        if(u.descripcion) pdf.text(String(u.descripcion).slice(0,42),x+cellW/2,y+15,{align:'center'});
        const qrSize=Math.min(58,cellW-18,cellH-31);
        pdf.addImage(u.qr,'PNG',x+(cellW-qrSize)/2,y+20,qrSize,qrSize);
        pdf.setFontSize(7);pdf.text('Escanear para actualizar ubicación',x+cellW/2,y+cellH-7,{align:'center'});
      });
      const name=selected.length===1?'QR_'+(selected[0].numero||'UNIDAD')+'.pdf':'QR_UNIDADES_'+selected.length+'.pdf';
      pdf.save(name.replace(/[^A-Za-z0-9_.-]/g,'_'));
      modal.remove();
    }catch(e){console.error('QR PDF:',e);alert('No se pudo generar el PDF de QR.\n\n'+(e.message||e));}
    finally{btn.disabled=false;btn.innerHTML=old;}
  }

  function hook(){
    ensureButton();
    const fn=window.ccRenderInventario;
    if(typeof fn==='function'&&!fn.__qrBatchV1){
      const w=function(){const r=fn.apply(this,arguments);setTimeout(ensureButton,0);return r;};
      w.__qrBatchV1=true;window.ccRenderInventario=w;
    }
  }
  hook();
  document.addEventListener('click',e=>{const t=e.target.closest?.('#controlCajasSection .cc-tab');if(t&&(t.getAttribute('onclick')||'').includes("ccTab('inventario'"))setTimeout(hook,50);},true);
  window.addEventListener('load',()=>setTimeout(hook,250));
})();
